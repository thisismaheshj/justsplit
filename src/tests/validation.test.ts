import { describe, expect, it } from 'vitest';
import {
  validateCategoryLabel,
  validateExpense,
  validatePerson,
  validateRecurring,
  validateSettlement,
} from '@/lib/validation';
import type { ExpenseFormValues } from '@/lib/validation';

const baseExpense: ExpenseFormValues = {
  description: 'Dinner',
  amount: 10_000,
  paidBy: 'a',
  participants: [{ personId: 'a' }, { personId: 'b' }],
  splitMethod: 'equal',
  date: '2026-05-10',
};

describe('validatePerson', () => {
  it('requires a non-empty name after trimming', () => {
    expect(validatePerson({ name: 'Priya' }).valid).toBe(true);
    expect(validatePerson({ name: '   ' }).valid).toBe(false);
    expect(validatePerson({ name: '' }).errors.name).toBe('Name is required');
  });

  it('caps the name length', () => {
    expect(validatePerson({ name: 'x'.repeat(41) }).valid).toBe(false);
  });
});

describe('validateExpense', () => {
  it('accepts a well-formed expense', () => {
    expect(validateExpense(baseExpense).valid).toBe(true);
  });

  it('requires a description', () => {
    expect(validateExpense({ ...baseExpense, description: '  ' }).errors.description).toBeDefined();
  });

  it('requires a positive amount', () => {
    expect(validateExpense({ ...baseExpense, amount: 0 }).errors.amount).toBeDefined();
    expect(validateExpense({ ...baseExpense, amount: -1 }).errors.amount).toBeDefined();
  });

  it('requires a payer and at least one participant', () => {
    expect(validateExpense({ ...baseExpense, paidBy: '' }).errors.paidBy).toBeDefined();
    expect(validateExpense({ ...baseExpense, participants: [] }).errors.participants).toBeDefined();
  });

  it('allows a payer who is not a participant', () => {
    const result = validateExpense({
      ...baseExpense,
      paidBy: 'c',
      participants: [{ personId: 'a' }, { personId: 'b' }],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid date', () => {
    expect(validateExpense({ ...baseExpense, date: '10/05/2026' }).errors.date).toBeDefined();
    expect(validateExpense({ ...baseExpense, date: '2026-02-31' }).errors.date).toBeDefined();
  });

  it('blocks an exact split that does not add up, and passes one that does', () => {
    const bad = validateExpense({
      ...baseExpense,
      splitMethod: 'exact',
      participants: [
        { personId: 'a', inputValue: 4000 },
        { personId: 'b', inputValue: 4000 },
      ],
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.split).toBeDefined();

    const good = validateExpense({
      ...baseExpense,
      splitMethod: 'exact',
      participants: [
        { personId: 'a', inputValue: 4000 },
        { personId: 'b', inputValue: 6000 },
      ],
    });
    expect(good.valid).toBe(true);
  });

  it('blocks percentages that miss 100', () => {
    expect(
      validateExpense({
        ...baseExpense,
        splitMethod: 'percentage',
        participants: [
          { personId: 'a', inputValue: 60 },
          { personId: 'b', inputValue: 30 },
        ],
      }).valid,
    ).toBe(false);
  });

  it('blocks shares below one', () => {
    expect(
      validateExpense({
        ...baseExpense,
        splitMethod: 'shares',
        participants: [
          { personId: 'a', inputValue: 1 },
          { personId: 'b', inputValue: 0 },
        ],
      }).valid,
    ).toBe(false);
  });
});

describe('validateSettlement', () => {
  const base = { from: 'a', to: 'b', amount: 5000, date: '2026-05-10' };

  it('accepts a well-formed settlement', () => {
    expect(validateSettlement(base).valid).toBe(true);
  });

  it('rejects paying yourself', () => {
    expect(validateSettlement({ ...base, to: 'a' }).errors.to).toBeDefined();
  });

  it('requires a positive amount', () => {
    expect(validateSettlement({ ...base, amount: 0 }).errors.amount).toBeDefined();
  });

  it('allows an amount larger than the outstanding balance', () => {
    expect(validateSettlement({ ...base, amount: 9_999_999 }).valid).toBe(true);
  });
});

describe('validateRecurring', () => {
  it('requires a known frequency', () => {
    expect(
      validateRecurring({ ...baseExpense, frequency: 'daily' }).errors.frequency,
    ).toBeDefined();
    expect(validateRecurring({ ...baseExpense, frequency: 'monthly' }).valid).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    expect(
      validateRecurring({ ...baseExpense, frequency: 'monthly', endDate: '2026-05-01' }).errors
        .endDate,
    ).toBeDefined();
  });
});

describe('validateCategoryLabel', () => {
  it('rejects blanks and duplicates, case-insensitively', () => {
    expect(validateCategoryLabel('  ', []).valid).toBe(false);
    expect(validateCategoryLabel('Food', ['food']).valid).toBe(false);
    expect(validateCategoryLabel('Petrol', ['Food']).valid).toBe(true);
  });
});
