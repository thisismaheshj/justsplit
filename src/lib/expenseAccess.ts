import type { Expense } from '@/types';

/**
 * Mirrors migration 0019, which is what actually enforces these: the app uses
 * them to show the right buttons and explain why one is missing, the database
 * refuses anything that gets past it.
 */
export const MAX_EXPENSE_EDITS = 2;

export interface ExpenseAccess {
  /** You added this expense. */
  isCreator: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editsLeft: number;
}

export function expenseAccess(expense: Pick<Expense, 'createdBy' | 'editCount'>, userId: string | undefined): ExpenseAccess {
  const isCreator = Boolean(userId) && expense.createdBy === userId;
  const editsLeft = Math.max(0, MAX_EXPENSE_EDITS - (expense.editCount ?? 0));
  return { isCreator, canEdit: isCreator && editsLeft > 0, canDelete: isCreator, editsLeft };
}

/** True when saving `next` over `prev` would change nothing a person could see. */
export function isSameExpense(prev: Expense, next: Expense): boolean {
  const split = (e: Expense) =>
    JSON.stringify(e.participants.map((p) => [p.personId, p.amountOwed, p.inputValue ?? null]));
  return (
    prev.description === next.description &&
    prev.amount === next.amount &&
    prev.paidBy === next.paidBy &&
    prev.splitMethod === next.splitMethod &&
    prev.category === next.category &&
    prev.date === next.date &&
    (prev.note ?? '') === (next.note ?? '') &&
    split(prev) === split(next)
  );
}
