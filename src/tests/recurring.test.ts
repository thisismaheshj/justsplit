import { describe, expect, it } from 'vitest';
import {
  anchorDayOf,
  generateDueForTemplate,
  generateDueRecurringExpenses,
  nextOccurrence,
} from '@/lib/recurring';
import { addMonthsClamped, formatDayHeader, isValidDateString, parseLocalDate, toDateString } from '@/lib/date';
import type { RecurringExpense } from '@/types';

function template(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'r1',
    description: 'Rent',
    amount: 3_000_000,
    paidBy: 'a',
    participants: [
      { personId: 'a', inputValue: 50, amountOwed: 1_500_000 },
      { personId: 'b', inputValue: 50, amountOwed: 1_500_000 },
    ],
    splitMethod: 'percentage',
    category: 'rent',
    frequency: 'monthly',
    startDate: '2026-01-01',
    nextDueDate: '2026-01-01',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('nextOccurrence', () => {
  it('adds a week for weekly templates', () => {
    expect(nextOccurrence('2026-03-05', 'weekly')).toBe('2026-03-12');
    expect(nextOccurrence('2026-12-28', 'weekly')).toBe('2027-01-04');
  });

  it('adds a month for monthly templates', () => {
    expect(nextOccurrence('2026-03-15', 'monthly')).toBe('2026-04-15');
    expect(nextOccurrence('2026-12-15', 'monthly')).toBe('2027-01-15');
  });

  it('clamps to the last day when the target month is shorter', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    expect(nextOccurrence('2028-01-31', 'monthly', 31)).toBe('2028-02-29'); // leap year
    expect(nextOccurrence('2026-03-31', 'monthly', 31)).toBe('2026-04-30');
  });

  it('returns to the anchor day after a clamped month', () => {
    const anchor = anchorDayOf('2026-01-31');
    const feb = nextOccurrence('2026-01-31', 'monthly', anchor);
    expect(feb).toBe('2026-02-28');
    expect(nextOccurrence(feb, 'monthly', anchor)).toBe('2026-03-31');
  });
});

describe('addMonthsClamped', () => {
  it('never rolls over into the following month', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-08-31', 1)).toBe('2026-09-30');
    expect(addMonthsClamped('2026-01-15', 13)).toBe('2027-02-15');
  });
});

describe('generateDueForTemplate', () => {
  it('generates nothing when the next due date is still ahead', () => {
    const result = generateDueForTemplate(template({ nextDueDate: '2026-06-01' }), '2026-05-20');
    expect(result.expenses).toHaveLength(0);
    expect(result.nextDueDate).toBe('2026-06-01');
    expect(result.active).toBe(true);
  });

  it('generates the occurrence due today', () => {
    const result = generateDueForTemplate(template({ nextDueDate: '2026-05-01' }), '2026-05-01');
    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0].date).toBe('2026-05-01');
    expect(result.expenses[0].recurringExpenseId).toBe('r1');
    expect(result.nextDueDate).toBe('2026-06-01');
  });

  it('catches up every missed period when the app was closed for months', () => {
    const result = generateDueForTemplate(
      template({ startDate: '2026-01-01', nextDueDate: '2026-01-01' }),
      '2026-05-10',
    );
    expect(result.expenses.map((e) => e.date)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
    ]);
    expect(result.nextDueDate).toBe('2026-06-01');
  });

  it('catches up weekly templates too', () => {
    const result = generateDueForTemplate(
      template({ frequency: 'weekly', startDate: '2026-03-02', nextDueDate: '2026-03-02' }),
      '2026-03-24',
    );
    expect(result.expenses.map((e) => e.date)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
    ]);
    expect(result.nextDueDate).toBe('2026-03-30');
  });

  it('carries the template split through to every generated expense', () => {
    const result = generateDueForTemplate(template({ nextDueDate: '2026-01-01' }), '2026-02-05');
    for (const expense of result.expenses) {
      expect(expense.amount).toBe(3_000_000);
      expect(expense.splitMethod).toBe('percentage');
      expect(expense.participants).toEqual([
        { personId: 'a', inputValue: 50 },
        { personId: 'b', inputValue: 50 },
      ]);
    }
  });

  it('generates nothing while paused', () => {
    const result = generateDueForTemplate(
      template({ active: false, nextDueDate: '2026-01-01' }),
      '2026-05-01',
    );
    expect(result.expenses).toHaveLength(0);
    expect(result.nextDueDate).toBe('2026-01-01');
    expect(result.active).toBe(false);
  });

  it('deactivates the template once it runs past its end date', () => {
    const result = generateDueForTemplate(
      template({ nextDueDate: '2026-01-01', endDate: '2026-03-15' }),
      '2026-06-01',
    );
    expect(result.expenses.map((e) => e.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(result.active).toBe(false);
  });

  it('stops immediately when the end date has already passed', () => {
    const result = generateDueForTemplate(
      template({ nextDueDate: '2026-04-01', endDate: '2026-03-01' }),
      '2026-06-01',
    );
    expect(result.expenses).toHaveLength(0);
    expect(result.active).toBe(false);
  });

  it('respects the month-end anchor while catching up', () => {
    const result = generateDueForTemplate(
      template({ startDate: '2026-01-31', nextDueDate: '2026-01-31' }),
      '2026-04-30',
    );
    expect(result.expenses.map((e) => e.date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});

describe('generateDueRecurringExpenses', () => {
  it('only reports templates that actually changed', () => {
    const results = generateDueRecurringExpenses(
      [
        template({ id: 'due', nextDueDate: '2026-01-01' }),
        template({ id: 'future', nextDueDate: '2026-09-01' }),
        template({ id: 'paused', active: false, nextDueDate: '2026-01-01' }),
      ],
      '2026-02-05',
    );
    expect(Object.keys(results)).toEqual(['due']);
    expect(results.due.expenses).toHaveLength(2);
  });
});

describe('local date helpers', () => {
  it('parses date-only strings in local time, without a timezone shift', () => {
    const parsed = parseLocalDate('2026-03-01');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(1);
    expect(toDateString(parsed)).toBe('2026-03-01');
  });

  it('validates date strings strictly', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-2-1')).toBe(false);
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString(undefined)).toBe(false);
  });

  it('labels today and yesterday in words', () => {
    expect(formatDayHeader('2026-05-10', '2026-05-10')).toBe('Today');
    expect(formatDayHeader('2026-05-09', '2026-05-10')).toBe('Yesterday');
    expect(formatDayHeader('2026-05-01', '2026-05-10')).toMatch(/1 May/);
  });
});
