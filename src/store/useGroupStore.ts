import { create } from 'zustand';
import { toast } from 'sonner';
import type {
  AppState,
  Category,
  Expense,
  ExpenseInput,
  Person,
  RecurringExpense,
  RecurringInput,
  SettlementInput,
} from '@/types';
import * as api from '@/lib/groupsApi';
import type { GroupSummary } from '@/lib/groupsApi';
import { computeSplit } from '@/lib/calculations';
import { generateDueRecurringExpenses, anchorDayOf, nextOccurrence } from '@/lib/recurring';
import { DEFAULT_CATEGORIES, categoryIdFromLabel, isDefaultCategory } from '@/lib/categories';
import { colorFromString } from '@/lib/avatar';
import { generateId } from '@/lib/id';
import { todayString } from '@/lib/date';

/** Remembers which group you were last looking at. The ledger itself is not
 *  cached here -- Postgres is the source of truth. */
export const ACTIVE_GROUP_KEY = 'justsplit-active-group';

const emptyState: AppState = {
  group: null,
  people: [],
  expenses: [],
  settlements: [],
  recurringExpenses: [],
  categories: DEFAULT_CATEGORIES,
};

function now(): string {
  return new Date().toISOString();
}

export function shouldCreateFirstOccurrence(startDate: string): boolean {
  return startDate <= todayString();
}

export interface GroupStore extends AppState {
  /** Active group id, or null before one is chosen. */
  groupId: string | null;
  /** Every group the signed-in user belongs to. */
  groups: GroupSummary[];
  /** True once a first load has settled, so routes stop guessing. */
  hydrated: boolean;
  loading: boolean;

  setHydrated: (value: boolean) => void;
  bootstrap: () => Promise<void>;
  selectGroup: (groupId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearLocal: () => void;

  createGroup: (
    name: string,
    currency: string,
    people: { name: string; avatarPhoto?: string }[],
  ) => Promise<string>;

  addPerson: (name: string, avatarPhoto?: string) => string;
  updatePerson: (id: string, updates: Partial<Pick<Person, 'name' | 'avatarPhoto'>>) => void;
  removePerson: (id: string) => void;

  addExpense: (input: ExpenseInput) => string;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;

  addSettlement: (input: SettlementInput) => string;
  updateSettlement: (id: string, input: SettlementInput) => void;
  deleteSettlement: (id: string) => void;

  addRecurringExpense: (input: RecurringInput) => string;
  updateRecurringExpense: (id: string, input: RecurringInput) => void;
  toggleRecurringActive: (id: string, active: boolean) => void;
  deleteRecurringExpense: (id: string) => void;
  runDueRecurringCheck: () => number;

  addCustomCategory: (label: string, icon: string) => void;
  removeCustomCategory: (id: string) => void;

  updateGroupName: (name: string) => void;
  updateCurrency: (currencyCode: string) => void;
  deleteActiveGroup: () => Promise<void>;
  loadDemoData: () => Promise<string>;
}

function buildRecurring(input: RecurringInput, existing?: RecurringExpense): RecurringExpense {
  const participants = computeSplit(input.splitMethod, input.amount, input.participants);

  let nextDueDate = existing?.nextDueDate ?? input.startDate;
  if (!existing) {
    nextDueDate = input.firstOccurrenceCreated
      ? nextOccurrence(input.startDate, input.frequency, anchorDayOf(input.startDate))
      : input.startDate;
  } else if (existing.startDate !== input.startDate || existing.frequency !== input.frequency) {
    const anchor = anchorDayOf(input.startDate);
    let due = input.startDate;
    const today = todayString();
    let guard = 0;
    while (due <= today && guard < 500) {
      due = nextOccurrence(due, input.frequency, anchor);
      guard += 1;
    }
    nextDueDate = due;
  }

  const active = input.active ?? existing?.active ?? true;

  return {
    id: existing?.id ?? generateId(),
    description: input.description.trim(),
    amount: input.amount,
    paidBy: input.paidBy,
    participants,
    splitMethod: input.splitMethod,
    category: input.category,
    frequency: input.frequency,
    startDate: input.startDate,
    nextDueDate,
    endDate: input.endDate || undefined,
    active: input.endDate && nextDueDate > input.endDate ? false : active,
    note: input.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
}

export const useGroupStore = create<GroupStore>()((set, get) => {
  /**
   * Apply a change locally straight away, then push it. If the write is
   * rejected -- offline, or RLS saying no -- put the previous state back and
   * say so, rather than leaving the screen showing something the server never
   * accepted.
   */
  function optimistic(applyLocal: () => void, write: () => Promise<unknown>, label: string) {
    const before: AppState = {
      group: get().group,
      people: get().people,
      expenses: get().expenses,
      settlements: get().settlements,
      recurringExpenses: get().recurringExpenses,
      categories: get().categories,
    };
    applyLocal();
    void write().catch((error: unknown) => {
      set({ ...before });
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Could not ${label}`, { description: message });
    });
  }

  const requireGroup = (): string => {
    const id = get().groupId;
    if (!id) throw new Error('No group selected');
    return id;
  };

  return {
    ...emptyState,
    groupId: null,
    groups: [],
    hydrated: false,
    loading: false,

    setHydrated: (value) => set({ hydrated: value }),

    clearLocal: () => set({ ...emptyState, groupId: null, groups: [], hydrated: true }),

    bootstrap: async () => {
      set({ loading: true });
      try {
        const groups = await api.listGroups();
        set({ groups });

        if (groups.length === 0) {
          set({ ...emptyState, groupId: null, hydrated: true, loading: false });
          return;
        }

        const remembered = localStorage.getItem(ACTIVE_GROUP_KEY);
        const active = groups.find((g) => g.id === remembered) ?? groups[0];
        await get().selectGroup(active.id);
      } catch (error) {
        set({ hydrated: true, loading: false });
        toast.error('Could not load your groups', {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },

    selectGroup: async (groupId) => {
      set({ loading: true });
      try {
        const snapshot = await api.loadGroup(groupId);
        localStorage.setItem(ACTIVE_GROUP_KEY, groupId);
        set({ ...snapshot, groupId, hydrated: true, loading: false });
      } catch (error) {
        set({ hydrated: true, loading: false });
        toast.error('Could not open that group', {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },

    refresh: async () => {
      const id = get().groupId;
      if (id) await get().selectGroup(id);
    },

    createGroup: async (name, currency, people) => {
      const groupId = await api.createGroup(name, currency, people[0]?.name);

      // create_group seeds a row for the signed-in user, so the first name in
      // the list is already taken -- only the rest need adding.
      const existing = await api.loadGroup(groupId);
      const seat = existing.people[0];
      if (seat && people[0]) {
        await api.updateMember(seat.id, {
          name: people[0].name,
          avatarPhoto: people[0].avatarPhoto ?? null,
        });
      }
      for (const person of people.slice(1)) {
        if (!person.name.trim()) continue;
        const id = generateId();
        await api.addMember(groupId, {
          id,
          name: person.name,
          avatarColor: colorFromString(id),
          avatarPhoto: person.avatarPhoto,
        });
      }

      set({ groups: await api.listGroups() });
      await get().selectGroup(groupId);
      return groupId;
    },

    /* ------------------------------------------------------------ people -- */

    addPerson: (name, avatarPhoto) => {
      const groupId = requireGroup();
      const id = generateId();
      const person: Person = {
        id,
        name: name.trim(),
        avatarPhoto,
        avatarColor: colorFromString(id),
        createdAt: now(),
        userId: null,
        role: 'member',
      };
      optimistic(
        () => set((s) => ({ people: [...s.people, person] })),
        () => api.addMember(groupId, { id, name: person.name, avatarColor: person.avatarColor, avatarPhoto }),
        `add ${person.name}`,
      );
      return id;
    },

    updatePerson: (id, updates) => {
      optimistic(
        () =>
          set((s) => ({
            people: s.people.map((p) =>
              p.id === id
                ? {
                    ...p,
                    ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
                    ...('avatarPhoto' in updates ? { avatarPhoto: updates.avatarPhoto } : {}),
                  }
                : p,
            ),
          })),
        () =>
          api.updateMember(id, {
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...('avatarPhoto' in updates ? { avatarPhoto: updates.avatarPhoto ?? null } : {}),
          }),
        'save that change',
      );
    },

    /**
     * Someone with history is archived, never deleted: their id is still
     * referenced by every expense they were part of, and the database refuses
     * to orphan those rows. Someone with no history is removed outright.
     */
    removePerson: (id) => {
      const state = get();
      if (state.people.filter((p) => !p.archived).length <= 1) return;

      const hasHistory =
        state.expenses.some((e) => e.paidBy === id || e.participants.some((p) => p.personId === id)) ||
        state.settlements.some((s) => s.from === id || s.to === id) ||
        state.recurringExpenses.some(
          (r) => r.paidBy === id || r.participants.some((p) => p.personId === id),
        );

      if (hasHistory) {
        optimistic(
          () =>
            set((s) => ({
              people: s.people.map((p) => (p.id === id ? { ...p, archived: true } : p)),
              recurringExpenses: s.recurringExpenses.map((r) =>
                r.paidBy === id || r.participants.some((p) => p.personId === id)
                  ? { ...r, active: false }
                  : r,
              ),
            })),
          async () => {
            await api.updateMember(id, { archived: true });
            const affected = get().recurringExpenses.filter(
              (r) => r.paidBy === id || r.participants.some((p) => p.personId === id),
            );
            for (const r of affected) await api.saveRecurring(requireGroup(), { ...r, active: false });
          },
          'remove that person',
        );
      } else {
        optimistic(
          () => set((s) => ({ people: s.people.filter((p) => p.id !== id) })),
          () => api.deleteMember(id),
          'remove that person',
        );
      }
    },

    /* ---------------------------------------------------------- expenses -- */

    addExpense: (input) => {
      const groupId = requireGroup();
      const expense = api.buildExpenseRecord(input);
      optimistic(
        () => set((s) => ({ expenses: [...s.expenses, expense] })),
        () => api.saveExpense(groupId, expense),
        'save that expense',
      );
      return expense.id;
    },

    updateExpense: (id, input) => {
      const groupId = requireGroup();
      const existing = get().expenses.find((e) => e.id === id);
      const expense = api.buildExpenseRecord(input, existing);
      optimistic(
        () => set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? expense : e)) })),
        () => api.saveExpense(groupId, expense),
        'save that expense',
      );
    },

    deleteExpense: (id) => {
      optimistic(
        () => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
        () => api.deleteExpense(id),
        'delete that expense',
      );
    },

    /* ------------------------------------------------------- settlements -- */

    addSettlement: (input) => {
      const groupId = requireGroup();
      const settlement = api.buildSettlementRecord(input);
      optimistic(
        () => set((s) => ({ settlements: [...s.settlements, settlement] })),
        () => api.saveSettlement(groupId, settlement),
        'record that settlement',
      );
      return settlement.id;
    },

    updateSettlement: (id, input) => {
      const groupId = requireGroup();
      const existing = get().settlements.find((s) => s.id === id);
      const settlement = api.buildSettlementRecord(input, existing);
      optimistic(
        () => set((s) => ({ settlements: s.settlements.map((x) => (x.id === id ? settlement : x)) })),
        () => api.saveSettlement(groupId, settlement),
        'save that settlement',
      );
    },

    deleteSettlement: (id) => {
      optimistic(
        () => set((s) => ({ settlements: s.settlements.filter((x) => x.id !== id) })),
        () => api.deleteSettlement(id),
        'delete that settlement',
      );
    },

    /* --------------------------------------------------------- recurring -- */

    addRecurringExpense: (input) => {
      const groupId = requireGroup();
      const template = buildRecurring(input);
      optimistic(
        () => set((s) => ({ recurringExpenses: [...s.recurringExpenses, template] })),
        () => api.saveRecurring(groupId, template),
        'save that repeating expense',
      );
      return template.id;
    },

    updateRecurringExpense: (id, input) => {
      const groupId = requireGroup();
      const existing = get().recurringExpenses.find((r) => r.id === id);
      const template = buildRecurring(input, existing);
      optimistic(
        () =>
          set((s) => ({
            recurringExpenses: s.recurringExpenses.map((r) => (r.id === id ? template : r)),
          })),
        () => api.saveRecurring(groupId, template),
        'save that repeating expense',
      );
    },

    toggleRecurringActive: (id, active) => {
      const groupId = requireGroup();
      const template = get().recurringExpenses.find((r) => r.id === id);
      if (!template) return;
      optimistic(
        () =>
          set((s) => ({
            recurringExpenses: s.recurringExpenses.map((r) => (r.id === id ? { ...r, active } : r)),
          })),
        () => api.saveRecurring(groupId, { ...template, active }),
        active ? 'resume that template' : 'pause that template',
      );
    },

    deleteRecurringExpense: (id) => {
      optimistic(
        () => set((s) => ({ recurringExpenses: s.recurringExpenses.filter((r) => r.id !== id) })),
        () => api.deleteRecurring(id),
        'delete that repeating expense',
      );
    },

    runDueRecurringCheck: () => {
      const state = get();
      if (!state.group || !state.groupId) return 0;

      const results = generateDueRecurringExpenses(state.recurringExpenses, todayString());
      const ids = Object.keys(results);
      if (ids.length === 0) return 0;

      const groupId = state.groupId;
      const created: Expense[] = [];
      for (const id of ids) {
        for (const input of results[id].expenses) created.push(api.buildExpenseRecord(input));
      }

      const updatedTemplates = state.recurringExpenses.map((r) => {
        const generated = results[r.id];
        if (!generated) return r;
        return { ...r, nextDueDate: generated.nextDueDate, active: generated.active, updatedAt: now() };
      });

      optimistic(
        () =>
          set({
            expenses: created.length ? [...state.expenses, ...created] : state.expenses,
            recurringExpenses: updatedTemplates,
          }),
        async () => {
          for (const expense of created) await api.saveExpense(groupId, expense);
          for (const id of ids) {
            const template = updatedTemplates.find((r) => r.id === id);
            if (template) await api.saveRecurring(groupId, template);
          }
        },
        'add the due repeating expenses',
      );

      return created.length;
    },

    /* -------------------------------------------------------- categories -- */

    addCustomCategory: (label, icon) => {
      const groupId = requireGroup();
      const id = categoryIdFromLabel(
        label,
        get().categories.map((c) => c.id),
      );
      const category: Category = { id, label: label.trim(), icon, isCustom: true };
      optimistic(
        () => set((s) => ({ categories: [...s.categories, category] })),
        () => api.addCategory(groupId, category),
        'add that category',
      );
    },

    removeCustomCategory: (id) => {
      if (isDefaultCategory(id)) return;
      const groupId = requireGroup();
      const affected = get().expenses.filter((e) => e.category === id);
      optimistic(
        () =>
          set((s) => ({
            categories: s.categories.filter((c) => c.id !== id),
            expenses: s.expenses.map((e) => (e.category === id ? { ...e, category: 'other' } : e)),
            recurringExpenses: s.recurringExpenses.map((r) =>
              r.category === id ? { ...r, category: 'other' } : r,
            ),
          })),
        async () => {
          // Expenses have to move off the category before it disappears.
          for (const e of affected) await api.saveExpense(groupId, { ...e, category: 'other' });
          for (const r of get().recurringExpenses.filter((x) => x.category === 'other')) {
            if (r.category === 'other') await api.saveRecurring(groupId, r);
          }
          await api.removeCategory(groupId, id);
        },
        'remove that category',
      );
    },

    /* ---------------------------------------------------------- settings -- */

    updateGroupName: (name) => {
      const groupId = requireGroup();
      optimistic(
        () =>
          set((s) => ({
            group: s.group ? { ...s.group, name: name.trim() } : s.group,
            groups: s.groups.map((g) => (g.id === groupId ? { ...g, name: name.trim() } : g)),
          })),
        () => api.updateGroupFields(groupId, { name }),
        'rename the group',
      );
    },

    updateCurrency: (currencyCode) => {
      const groupId = requireGroup();
      optimistic(
        () =>
          set((s) => ({
            group: s.group ? { ...s.group, currency: currencyCode } : s.group,
            groups: s.groups.map((g) => (g.id === groupId ? { ...g, currency: currencyCode } : g)),
          })),
        () => api.updateGroupFields(groupId, { currency: currencyCode }),
        'change the currency',
      );
    },

    /** Adds the sample "Goa Trip" alongside whatever else you have, rather
     *  than replacing it -- with multiple groups there is no reason to. */
    loadDemoData: async () => {
      const { buildSeedData } = await import('@/lib/seedData');
      const groupId = await api.importLocalGroup(buildSeedData(), {});
      set({ groups: await api.listGroups() });
      await get().selectGroup(groupId);
      return groupId;
    },

    deleteActiveGroup: async () => {
      const groupId = get().groupId;
      if (!groupId) return;
      await api.deleteGroup(groupId);
      localStorage.removeItem(ACTIVE_GROUP_KEY);
      set({ ...emptyState, groupId: null });
      await get().bootstrap();
    },
  };
});
