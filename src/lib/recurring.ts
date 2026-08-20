import type { Expense, ExpenseInput, RecurringExpense } from '@/types';
import { addMonthsClamped, addWeeksStr, parseLocalDate, todayString } from '@/lib/date';

/**
 * 10 — Recurring date math and catch-up generation.
 * Pure functions: they never touch the store, they just describe what should
 * happen so the store can commit it.
 */

/** The next due date after `from`, honouring month-end clamping. */
export function nextOccurrence(
  from: string,
  frequency: RecurringExpense['frequency'],
  anchorDay?: number,
): string {
  if (frequency === 'weekly') return addWeeksStr(from, 1);
  return addMonthsClamped(from, 1, anchorDay);
}

/** Day-of-month a monthly series is anchored to (so Jan 31 -> Feb 28 -> Mar 31). */
export function anchorDayOf(startDate: string): number {
  return parseLocalDate(startDate).getDate();
}

export interface RecurringGenerationResult {
  /** Expense payloads to create, oldest first. */
  expenses: (ExpenseInput & { recurringExpenseId: string })[];
  /** The template's new nextDueDate. */
  nextDueDate: string;
  /** False when endDate has been passed — the template deactivates. */
  active: boolean;
}

/**
 * Walk a single template forward from its nextDueDate, emitting one expense per
 * missed occurrence up to and including today. Catches up any periods missed
 * while the app was closed.
 */
export function generateDueForTemplate(
  template: RecurringExpense,
  today = todayString(),
  maxIterations = 500,
): RecurringGenerationResult {
  const result: RecurringGenerationResult = {
    expenses: [],
    nextDueDate: template.nextDueDate,
    active: template.active,
  };

  if (!template.active) return result;

  const anchor = anchorDayOf(template.startDate);
  let due = template.nextDueDate;
  let iterations = 0;

  while (due <= today && iterations < maxIterations) {
    // An endDate that has already passed stops generation entirely.
    if (template.endDate && due > template.endDate) {
      result.active = false;
      break;
    }

    result.expenses.push({
      description: template.description,
      amount: template.amount,
      paidBy: template.paidBy,
      participants: template.participants.map((p) => ({
        personId: p.personId,
        inputValue: p.inputValue,
      })),
      splitMethod: template.splitMethod,
      category: template.category,
      date: due,
      note: template.note,
      recurringExpenseId: template.id,
    });

    due = nextOccurrence(due, template.frequency, anchor);
    iterations += 1;

    if (template.endDate && due > template.endDate) {
      result.active = false;
      break;
    }
  }

  result.nextDueDate = due;
  return result;
}

/** Run every template through `generateDueForTemplate`. */
export function generateDueRecurringExpenses(
  templates: RecurringExpense[],
  today = todayString(),
): Record<string, RecurringGenerationResult> {
  const out: Record<string, RecurringGenerationResult> = {};
  for (const template of templates) {
    const generated = generateDueForTemplate(template, today);
    if (
      generated.expenses.length > 0 ||
      generated.nextDueDate !== template.nextDueDate ||
      generated.active !== template.active
    ) {
      out[template.id] = generated;
    }
  }
  return out;
}

/** Expenses already generated from a given template. */
export function instancesOf(expenses: Expense[], templateId: string): Expense[] {
  return expenses.filter((e) => e.recurringExpenseId === templateId);
}

export function frequencyLabel(frequency: RecurringExpense['frequency']): string {
  return frequency === 'weekly' ? 'Weekly' : 'Monthly';
}
