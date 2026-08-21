import { supabase } from '@/lib/supabase';
import type {
  AppState,
  Category,
  Expense,
  ExpenseInput,
  Group,
  Person,
  RecurringExpense,
  RecurringInput,
  Settlement,
  SettlementInput,
  SplitMethod,
} from '@/types';
import { computeSplit } from '@/lib/calculations';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { generateId } from '@/lib/id';

/**
 * Every read and write against Postgres lives here, so the store deals in the
 * app's own types and never in database column names.
 *
 * Two things this layer is responsible for:
 *  - money stays an integer in minor units on both sides of the wire
 *  - participant order survives the round trip, because the split algorithms
 *    hand leftover minor units to the first N participants "in order"
 */

function db() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

/* ------------------------------------------------------------ row types -- */

interface MemberRow {
  id: string;
  user_id: string | null;
  name: string;
  avatar_color: string;
  avatar_photo: string | null;
  archived: boolean;
  role: string;
  created_at: string;
}

interface ParticipantRow {
  member_id: string;
  input_value: number | null;
  amount_owed: number;
  position: number;
}

/* -------------------------------------------------------------- mapping -- */

function toPerson(row: MemberRow): Person {
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatar_color,
    avatarPhoto: row.avatar_photo ?? undefined,
    archived: row.archived || undefined,
    userId: row.user_id,
    role: row.role === 'owner' ? 'owner' : 'member',
    createdAt: row.created_at,
  };
}

/** Participant rows come back unordered; `position` is the real order. */
function toParticipants(rows: ParticipantRow[]) {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      personId: p.member_id,
      inputValue: p.input_value ?? undefined,
      amountOwed: p.amount_owed,
    }));
}

function participantsPayload(
  participants: { personId: string; inputValue?: number; amountOwed: number }[],
) {
  return participants.map((p, index) => ({
    member_id: p.personId,
    input_value: p.inputValue ?? null,
    amount_owed: p.amountOwed,
    position: index,
  }));
}

/* ---------------------------------------------------------------- reads -- */

export interface GroupSummary {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
}

/** Every group the signed-in user belongs to. RLS does the filtering. */
export async function listGroups(): Promise<GroupSummary[]> {
  const { data, error } = await db()
    .from('groups')
    .select('id, name, currency, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    currency: g.currency,
    createdAt: g.created_at,
  }));
}

export type GroupSnapshot = Omit<AppState, 'group'> & { group: Group };

/** Everything needed to render one group, in a handful of parallel queries. */
export async function loadGroup(groupId: string): Promise<GroupSnapshot> {
  const client = db();

  const [groupRes, membersRes, expensesRes, settlementsRes, recurringRes, categoriesRes] =
    await Promise.all([
      client.from('groups').select('id, name, currency, created_at').eq('id', groupId).single(),
      client
        .from('group_members')
        .select('id, user_id, name, avatar_color, avatar_photo, archived, role, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true }),
      client
        .from('expenses')
        .select(
          'id, description, amount, paid_by, split_method, category, date, note, recurring_expense_id, created_at, updated_at, expense_participants(member_id, input_value, amount_owed, position)',
        )
        .eq('group_id', groupId),
      client
        .from('settlements')
        .select('id, from_member, to_member, amount, date, note, created_at, updated_at')
        .eq('group_id', groupId),
      client
        .from('recurring_expenses')
        .select(
          'id, description, amount, paid_by, split_method, category, frequency, start_date, next_due_date, end_date, active, note, created_at, updated_at, recurring_participants(member_id, input_value, amount_owed, position)',
        )
        .eq('group_id', groupId),
      client.from('group_categories').select('id, label, icon').eq('group_id', groupId),
    ]);

  for (const res of [groupRes, membersRes, expensesRes, settlementsRes, recurringRes, categoriesRes]) {
    if (res.error) throw res.error;
  }

  const g = groupRes.data!;

  const expenses: Expense[] = (expensesRes.data ?? []).map((e) => ({
    id: e.id,
    type: 'expense',
    description: e.description,
    amount: e.amount,
    paidBy: e.paid_by,
    participants: toParticipants((e.expense_participants ?? []) as ParticipantRow[]),
    splitMethod: e.split_method as SplitMethod,
    category: e.category,
    date: e.date,
    note: e.note ?? undefined,
    recurringExpenseId: e.recurring_expense_id ?? undefined,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }));

  const settlements: Settlement[] = (settlementsRes.data ?? []).map((s) => ({
    id: s.id,
    type: 'settlement',
    from: s.from_member,
    to: s.to_member,
    amount: s.amount,
    date: s.date,
    note: s.note ?? undefined,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  const recurringExpenses: RecurringExpense[] = (recurringRes.data ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    paidBy: r.paid_by,
    participants: toParticipants((r.recurring_participants ?? []) as ParticipantRow[]),
    splitMethod: r.split_method as SplitMethod,
    category: r.category,
    frequency: r.frequency as RecurringExpense['frequency'],
    startDate: r.start_date,
    nextDueDate: r.next_due_date,
    endDate: r.end_date ?? undefined,
    active: r.active,
    note: r.note ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const custom: Category[] = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    isCustom: true,
  }));

  return {
    group: { id: g.id, name: g.name, currency: g.currency, createdAt: g.created_at },
    people: ((membersRes.data ?? []) as MemberRow[]).map(toPerson),
    expenses,
    settlements,
    recurringExpenses,
    // Defaults live in code and are identical for everyone; only custom ones
    // are stored, so the union is rebuilt here rather than duplicated per group.
    categories: [...DEFAULT_CATEGORIES, ...custom],
  };
}

/* --------------------------------------------------------------- writes -- */

export async function createGroup(
  name: string,
  currency: string,
  ownerName?: string,
): Promise<string> {
  const { data, error } = await db().rpc('create_group', {
    p_name: name.trim(),
    p_currency: currency,
    p_owner_name: ownerName?.trim() || undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function updateGroupFields(
  groupId: string,
  fields: { name?: string; currency?: string },
): Promise<void> {
  const { error } = await db()
    .from('groups')
    .update({
      ...(fields.name !== undefined ? { name: fields.name.trim() } : {}),
      ...(fields.currency !== undefined ? { currency: fields.currency } : {}),
    })
    .eq('id', groupId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await db().from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function addMember(
  groupId: string,
  member: { id: string; name: string; avatarColor: string; avatarPhoto?: string },
): Promise<void> {
  const { error } = await db().from('group_members').insert({
    id: member.id,
    group_id: groupId,
    name: member.name.trim(),
    avatar_color: member.avatarColor,
    avatar_photo: member.avatarPhoto ?? null,
  });
  if (error) throw error;
}

export async function updateMember(
  memberId: string,
  patch: { name?: string; avatarPhoto?: string | null; archived?: boolean },
): Promise<void> {
  const { error } = await db()
    .from('group_members')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...('avatarPhoto' in patch ? { avatar_photo: patch.avatarPhoto ?? null } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    })
    .eq('id', memberId);
  if (error) throw error;
}

/** Only safe for a member with no ledger history; the FK refuses otherwise. */
export async function deleteMember(memberId: string): Promise<void> {
  const { error } = await db().from('group_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function saveExpense(
  groupId: string,
  expense: Expense,
): Promise<string> {
  const { data, error } = await db().rpc('save_expense', {
    p_group_id: groupId,
    p_expense_id: expense.id,
    p_description: expense.description,
    p_amount: expense.amount,
    p_paid_by: expense.paidBy,
    p_split_method: expense.splitMethod,
    p_category: expense.category,
    p_date: expense.date,
    p_note: expense.note ?? undefined,
    p_recurring_expense_id: expense.recurringExpenseId ?? undefined,
    p_participants: participantsPayload(expense.participants),
  });
  if (error) throw error;
  return data as string;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await db().from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

export async function saveSettlement(groupId: string, s: Settlement): Promise<void> {
  const { error } = await db().from('settlements').upsert({
    id: s.id,
    group_id: groupId,
    from_member: s.from,
    to_member: s.to,
    amount: s.amount,
    date: s.date,
    note: s.note ?? null,
  });
  if (error) throw error;
}

export async function deleteSettlement(id: string): Promise<void> {
  const { error } = await db().from('settlements').delete().eq('id', id);
  if (error) throw error;
}

export async function saveRecurring(groupId: string, r: RecurringExpense): Promise<string> {
  const { data, error } = await db().rpc('save_recurring_expense', {
    p_group_id: groupId,
    p_recurring_id: r.id,
    p_description: r.description,
    p_amount: r.amount,
    p_paid_by: r.paidBy,
    p_split_method: r.splitMethod,
    p_category: r.category,
    p_frequency: r.frequency,
    p_start_date: r.startDate,
    p_next_due_date: r.nextDueDate,
    p_end_date: r.endDate ?? undefined,
    p_active: r.active,
    p_note: r.note ?? undefined,
    p_participants: participantsPayload(r.participants),
  });
  if (error) throw error;
  return data as string;
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await db().from('recurring_expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function addCategory(groupId: string, category: Category): Promise<void> {
  const { error } = await db().from('group_categories').insert({
    group_id: groupId,
    id: category.id,
    label: category.label,
    icon: category.icon,
  });
  if (error) throw error;
}

export async function removeCategory(groupId: string, categoryId: string): Promise<void> {
  const { error } = await db()
    .from('group_categories')
    .delete()
    .eq('group_id', groupId)
    .eq('id', categoryId);
  if (error) throw error;
}

/* ------------------------------------------------------ one-time import -- */

/**
 * Lifts a browser-only group into Postgres. Local ids are UUIDs already, so
 * they are reused verbatim: every expense keeps pointing at the same people
 * and nothing has to be remapped.
 *
 * The signed-in user claims whichever local person they say is them, so their
 * own history carries over instead of starting again next to it.
 */
export async function importLocalGroup(
  local: AppState,
  options: { claimPersonId?: string; ownerName?: string },
): Promise<string> {
  if (!local.group) throw new Error('Nothing to import.');
  const client = db();

  const groupId = await createGroup(local.group.name, local.group.currency, options.ownerName);

  // create_group already seeded a member row for the owner. Point it at the
  // local person they identified as themselves so that person's expenses stay
  // attached, rather than creating a second seat for the same human.
  const { data: seeded, error: seedError } = await client
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .limit(1)
    .single();
  if (seedError) throw seedError;

  const claimId = options.claimPersonId;
  const ownerSeatId = seeded.id as string;
  /** Local person id -> the member id it becomes in the database. */
  const idMap = new Map<string, string>();

  for (const person of local.people) {
    if (claimId && person.id === claimId) {
      idMap.set(person.id, ownerSeatId);
      await updateMember(ownerSeatId, {
        name: person.name,
        avatarPhoto: person.avatarPhoto ?? null,
        archived: person.archived ?? false,
      });
      continue;
    }
    const newId = generateId();
    idMap.set(person.id, newId);
    await addMember(groupId, {
      id: newId,
      name: person.name,
      avatarColor: person.avatarColor,
      avatarPhoto: person.avatarPhoto,
    });
    if (person.archived) await updateMember(newId, { archived: true });
  }

  // If nobody was claimed the seeded owner seat is a real extra person, so it
  // stays as-is; otherwise every reference below resolves through idMap.
  const mapId = (id: string) => idMap.get(id) ?? ownerSeatId;

  for (const category of local.categories.filter((c) => c.isCustom)) {
    await addCategory(groupId, category);
  }

  // Templates first: generated expenses reference them.
  for (const r of local.recurringExpenses) {
    await saveRecurring(groupId, {
      ...r,
      paidBy: mapId(r.paidBy),
      participants: r.participants.map((p) => ({ ...p, personId: mapId(p.personId) })),
    });
  }

  for (const e of local.expenses) {
    await saveExpense(groupId, {
      ...e,
      paidBy: mapId(e.paidBy),
      participants: e.participants.map((p) => ({ ...p, personId: mapId(p.personId) })),
    });
  }

  for (const s of local.settlements) {
    await saveSettlement(groupId, { ...s, from: mapId(s.from), to: mapId(s.to) });
  }

  return groupId;
}

/** Rebuilds an expense record from raw form input, reusing the shared maths. */
export function buildExpenseRecord(
  input: ExpenseInput,
  existing?: Expense,
): Expense {
  const participants = computeSplit(input.splitMethod, input.amount, input.participants);
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    type: 'expense',
    description: input.description.trim(),
    amount: input.amount,
    paidBy: input.paidBy,
    participants,
    splitMethod: input.splitMethod,
    category: input.category,
    date: input.date,
    note: input.note?.trim() || undefined,
    recurringExpenseId: input.recurringExpenseId ?? existing?.recurringExpenseId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function buildSettlementRecord(
  input: SettlementInput,
  existing?: Settlement,
): Settlement {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? generateId(),
    type: 'settlement',
    from: input.from,
    to: input.to,
    amount: input.amount,
    date: input.date,
    note: input.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export type { RecurringInput };
