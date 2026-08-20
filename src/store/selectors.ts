import type {
  AppState,
  BalanceMap,
  Category,
  DebtTransfer,
  Expense,
  Person,
  Settlement,
  Transaction,
} from '@/types';
import { computeBalances, expenseNetFor, settlementNetFor, totalSpend } from '@/lib/calculations';
import { simplifyDebts } from '@/lib/debtSimplification';
import { formatAbsCurrency } from '@/lib/currency';

/**
 * Derived data only — nothing here is persisted. Every value is recomputed
 * from expenses/settlements/people on demand.
 */

export function selectActivePeople(state: Pick<AppState, 'people'>): Person[] {
  return state.people.filter((p) => !p.archived);
}

export function selectPersonById(
  state: Pick<AppState, 'people'>,
  id: string | undefined,
): Person | undefined {
  return id ? state.people.find((p) => p.id === id) : undefined;
}

export function personName(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? 'Someone';
}

export function selectBalances(
  state: Pick<AppState, 'expenses' | 'settlements' | 'people'>,
): BalanceMap {
  return computeBalances(
    state.expenses,
    state.settlements,
    state.people.map((p) => p.id),
  );
}

export function selectSimplifiedDebts(
  state: Pick<AppState, 'expenses' | 'settlements' | 'people'>,
): DebtTransfer[] {
  return simplifyDebts(selectBalances(state));
}

export function selectTotalSpend(state: Pick<AppState, 'expenses'>): number {
  return totalSpend(state.expenses);
}

/** Sum of all positive balances (= sum of all debts, since balances net to 0). */
export function selectOutstandingTotal(
  state: Pick<AppState, 'expenses' | 'settlements' | 'people'>,
): number {
  const balances = selectBalances(state);
  return Object.values(balances).reduce((sum, v) => (v > 0 ? sum + v : sum), 0);
}

/** One chronological feed of expenses and settlements, newest first. */
export function selectTransactions(
  state: Pick<AppState, 'expenses' | 'settlements'>,
): Transaction[] {
  return [...state.expenses, ...state.settlements].sort(compareTransactionsDesc);
}

export function compareTransactionsDesc(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

export function selectRecentTransactions(
  state: Pick<AppState, 'expenses' | 'settlements'>,
  count = 5,
): Transaction[] {
  return selectTransactions(state).slice(0, count);
}

/** Everything involving a specific person, newest first. */
export function selectTransactionsForPerson(
  state: Pick<AppState, 'expenses' | 'settlements'>,
  personId: string,
): Transaction[] {
  const expenses = state.expenses.filter(
    (e) => e.paidBy === personId || e.participants.some((p) => p.personId === personId),
  );
  const settlements = state.settlements.filter(
    (s) => s.from === personId || s.to === personId,
  );
  return [...expenses, ...settlements].sort(compareTransactionsDesc);
}

export function transactionNetFor(transaction: Transaction, personId: string): number {
  return transaction.type === 'expense'
    ? expenseNetFor(transaction, personId)
    : settlementNetFor(transaction, personId);
}

/** Total this person has paid out for group expenses. */
export function selectPersonPaidTotal(state: Pick<AppState, 'expenses'>, personId: string): number {
  return state.expenses
    .filter((e) => e.paidBy === personId)
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Total share of group expenses assigned to this person. */
export function selectPersonShareTotal(state: Pick<AppState, 'expenses'>, personId: string): number {
  return state.expenses.reduce(
    (sum, e) => sum + (e.participants.find((p) => p.personId === personId)?.amountOwed ?? 0),
    0,
  );
}

export function selectCategory(state: Pick<AppState, 'categories'>, id: string): Category {
  return (
    state.categories.find((c) => c.id === id) ?? {
      id: 'other',
      label: 'Other',
      icon: 'MoreHorizontal',
    }
  );
}

/** The person who paid most recently — the sensible default payer. */
export function selectLastPayer(
  state: Pick<AppState, 'expenses' | 'people'>,
): string | undefined {
  const active = selectActivePeople(state as Pick<AppState, 'people'>);
  if (active.length === 0) return undefined;
  const sorted = [...state.expenses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const lastPayer = sorted.find((e) => active.some((p) => p.id === e.paidBy))?.paidBy;
  return lastPayer ?? active[0].id;
}

/* --------------------- 8.3 Natural-language summaries -------------------- */

export function describeTransfer(
  transfer: DebtTransfer,
  people: Person[],
  currency: string,
): string {
  return `${personName(people, transfer.from)} owes ${personName(people, transfer.to)} ${formatAbsCurrency(transfer.amount, currency)}`;
}

/** "gets back ₹1,500" / "owes ₹300" / "settled up" */
export function describeBalance(balance: number, currency: string): string {
  if (balance === 0) return 'settled up';
  return balance > 0
    ? `gets back ${formatAbsCurrency(balance, currency)}`
    : `owes ${formatAbsCurrency(balance, currency)}`;
}

/** Longer phrasing for a person's own detail page. */
export function describePersonOverall(
  name: string,
  balance: number,
  currency: string,
): string {
  if (balance === 0) return `${name} is all settled up`;
  return balance > 0
    ? `${name} is owed ${formatAbsCurrency(balance, currency)} overall`
    : `${name} owes ${formatAbsCurrency(balance, currency)} overall`;
}

/* --------------------------- History filtering --------------------------- */

export interface TransactionFilters {
  personId?: string;
  category?: string;
  from?: string;
  to?: string;
  query?: string;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  return transactions.filter((t) => {
    if (filters.from && t.date < filters.from) return false;
    if (filters.to && t.date > filters.to) return false;

    if (filters.personId) {
      const involved =
        t.type === 'expense'
          ? t.paidBy === filters.personId ||
            t.participants.some((p) => p.personId === filters.personId)
          : t.from === filters.personId || t.to === filters.personId;
      if (!involved) return false;
    }

    if (filters.category) {
      if (t.type !== 'expense' || t.category !== filters.category) return false;
    }

    if (filters.query) {
      const q = filters.query.toLowerCase();
      const haystack =
        t.type === 'expense' ? `${t.description} ${t.note ?? ''}` : `settlement ${t.note ?? ''}`;
      if (!haystack.toLowerCase().includes(q)) return false;
    }

    return true;
  });
}

/** Group a sorted transaction list into date buckets, newest bucket first. */
export function groupByDate(transactions: Transaction[]): { date: string; items: Transaction[] }[] {
  const buckets = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = buckets.get(t.date);
    if (list) list.push(t);
    else buckets.set(t.date, [t]);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items }));
}

export function isExpense(t: Transaction): t is Expense {
  return t.type === 'expense';
}

export function isSettlement(t: Transaction): t is Settlement {
  return t.type === 'settlement';
}
