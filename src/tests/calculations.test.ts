import { describe, expect, it } from 'vitest';
import {
  SplitError,
  computeBalances,
  computeSplit,
  splitEqual,
  splitExact,
  splitPercentage,
  splitShares,
} from '@/lib/calculations';
import { validateSplit } from '@/lib/validation';
import type { Expense, ParticipantShare, Settlement } from '@/types';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const sum = (shares: ParticipantShare[]) => shares.reduce((total, s) => total + s.amountOwed, 0);

describe('splitEqual', () => {
  it('divides evenly when the amount is divisible', () => {
    const shares = splitEqual(1200, ids(4));
    expect(shares.map((s) => s.amountOwed)).toEqual([300, 300, 300, 300]);
    expect(sum(shares)).toBe(1200);
  });

  it('gives the remainder to the first participants, in order', () => {
    const shares = splitEqual(1000, ids(3));
    expect(shares.map((s) => s.amountOwed)).toEqual([334, 333, 333]);
    expect(sum(shares)).toBe(1000);
  });

  it('handles an amount smaller than the participant count', () => {
    const shares = splitEqual(2, ids(5));
    expect(shares.map((s) => s.amountOwed)).toEqual([1, 1, 0, 0, 0]);
    expect(sum(shares)).toBe(2);
  });

  it('always sums exactly to the total across many shapes', () => {
    for (let amount = 1; amount <= 400; amount += 7) {
      for (let count = 1; count <= 9; count += 1) {
        expect(sum(splitEqual(amount, ids(count)))).toBe(amount);
      }
    }
  });

  it('rejects a non-positive amount and an empty participant list', () => {
    expect(() => splitEqual(0, ids(2))).toThrow(SplitError);
    expect(() => splitEqual(-100, ids(2))).toThrow(SplitError);
    expect(() => splitEqual(100, [])).toThrow(SplitError);
  });
});

describe('splitExact', () => {
  it('stores the entered amounts when they add up', () => {
    const shares = splitExact(1000, [
      { personId: 'a', inputValue: 600 },
      { personId: 'b', inputValue: 400 },
    ]);
    expect(shares.map((s) => s.amountOwed)).toEqual([600, 400]);
    expect(sum(shares)).toBe(1000);
  });

  it('rejects amounts that do not add up to the total', () => {
    expect(() =>
      splitExact(1000, [
        { personId: 'a', inputValue: 600 },
        { personId: 'b', inputValue: 300 },
      ]),
    ).toThrow(/add up/);
  });

  it('rejects negative and fractional minor-unit entries', () => {
    expect(() =>
      splitExact(100, [
        { personId: 'a', inputValue: -50 },
        { personId: 'b', inputValue: 150 },
      ]),
    ).toThrow(SplitError);
    expect(() =>
      splitExact(100, [
        { personId: 'a', inputValue: 50.5 },
        { personId: 'b', inputValue: 49.5 },
      ]),
    ).toThrow(SplitError);
  });
});

describe('splitPercentage', () => {
  it('splits by percentage and sums to the total', () => {
    const shares = splitPercentage(10_000, [
      { personId: 'a', inputValue: 50 },
      { personId: 'b', inputValue: 30 },
      { personId: 'c', inputValue: 20 },
    ]);
    expect(shares.map((s) => s.amountOwed)).toEqual([5000, 3000, 2000]);
    expect(sum(shares)).toBe(10_000);
  });

  it('gives leftover minor units to the largest fractional remainders', () => {
    // 100 / 3 -> 33.33 each; the two extra units go to the two largest remainders.
    const shares = splitPercentage(100, [
      { personId: 'a', inputValue: 33.33 },
      { personId: 'b', inputValue: 33.33 },
      { personId: 'c', inputValue: 33.34 },
    ]);
    expect(sum(shares)).toBe(100);
    expect(shares.map((s) => s.amountOwed)).toEqual([33, 33, 34]);
  });

  it('breaks remainder ties by participant order, deterministically', () => {
    const first = splitPercentage(1000, [
      { personId: 'a', inputValue: 33.33 },
      { personId: 'b', inputValue: 33.33 },
      { personId: 'c', inputValue: 33.34 },
    ]);
    const second = splitPercentage(1000, [
      { personId: 'a', inputValue: 33.33 },
      { personId: 'b', inputValue: 33.33 },
      { personId: 'c', inputValue: 33.34 },
    ]);
    expect(first).toEqual(second);
    expect(sum(first)).toBe(1000);
  });

  it('accepts two decimal places', () => {
    const shares = splitPercentage(100_000, [
      { personId: 'a', inputValue: 12.34 },
      { personId: 'b', inputValue: 87.66 },
    ]);
    expect(shares.map((s) => s.amountOwed)).toEqual([12_340, 87_660]);
  });

  it('rejects percentages that do not total 100', () => {
    expect(() =>
      splitPercentage(1000, [
        { personId: 'a', inputValue: 60 },
        { personId: 'b', inputValue: 30 },
      ]),
    ).toThrow(/100%/);
  });

  it('keeps the invariant across a sweep of amounts', () => {
    for (let amount = 1; amount <= 5000; amount += 137) {
      const shares = splitPercentage(amount, [
        { personId: 'a', inputValue: 16.67 },
        { personId: 'b', inputValue: 33.33 },
        { personId: 'c', inputValue: 50 },
      ]);
      expect(sum(shares)).toBe(amount);
    }
  });
});

describe('splitShares', () => {
  it('weights each participant by their share count', () => {
    const shares = splitShares(4000, [
      { personId: 'a', inputValue: 1 },
      { personId: 'b', inputValue: 1 },
      { personId: 'c', inputValue: 2 },
    ]);
    expect(shares.map((s) => s.amountOwed)).toEqual([1000, 1000, 2000]);
    expect(sum(shares)).toBe(4000);
  });

  it('distributes the remainder by largest fraction, then order', () => {
    const shares = splitShares(1000, [
      { personId: 'a', inputValue: 1 },
      { personId: 'b', inputValue: 1 },
      { personId: 'c', inputValue: 1 },
    ]);
    expect(shares.map((s) => s.amountOwed)).toEqual([334, 333, 333]);
    expect(sum(shares)).toBe(1000);
  });

  it('defaults a missing share to 1', () => {
    const shares = splitShares(300, [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }]);
    expect(shares.map((s) => s.amountOwed)).toEqual([100, 100, 100]);
  });

  it('rejects zero, negative and fractional shares', () => {
    expect(() => splitShares(100, [{ personId: 'a', inputValue: 0 }])).toThrow(SplitError);
    expect(() => splitShares(100, [{ personId: 'a', inputValue: -1 }])).toThrow(SplitError);
    expect(() => splitShares(100, [{ personId: 'a', inputValue: 1.5 }])).toThrow(SplitError);
  });
});

describe('computeSplit dispatch', () => {
  it('routes each method to its algorithm', () => {
    expect(computeSplit('equal', 300, [{ personId: 'a' }, { personId: 'b' }])).toHaveLength(2);
    expect(
      computeSplit('exact', 300, [
        { personId: 'a', inputValue: 100 },
        { personId: 'b', inputValue: 200 },
      ])[1].amountOwed,
    ).toBe(200);
    expect(
      computeSplit('percentage', 300, [
        { personId: 'a', inputValue: 25 },
        { personId: 'b', inputValue: 75 },
      ])[0].amountOwed,
    ).toBe(75);
    expect(
      computeSplit('shares', 300, [
        { personId: 'a', inputValue: 2 },
        { personId: 'b', inputValue: 1 },
      ])[0].amountOwed,
    ).toBe(200);
  });
});

describe('validateSplit', () => {
  it('reports how much of an exact split is unassigned', () => {
    const result = validateSplit('exact', 10_000, [
      { personId: 'a', inputValue: 4000 },
      { personId: 'b', inputValue: 1500 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(4500);
  });

  it('reports an exact split that overshoots', () => {
    const result = validateSplit('exact', 1000, [
      { personId: 'a', inputValue: 600 },
      { personId: 'b', inputValue: 600 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(-200);
  });

  it('requires percentages to total exactly 100', () => {
    expect(validateSplit('percentage', 1000, [{ personId: 'a', inputValue: 99.99 }]).valid).toBe(
      false,
    );
    expect(validateSplit('percentage', 1000, [{ personId: 'a', inputValue: 100 }]).valid).toBe(
      true,
    );
  });

  it('rejects non-positive shares', () => {
    expect(validateSplit('shares', 1000, [{ personId: 'a', inputValue: 0 }]).valid).toBe(false);
  });

  it('rejects an empty participant list and a zero amount', () => {
    expect(validateSplit('equal', 1000, []).valid).toBe(false);
    expect(validateSplit('equal', 0, [{ personId: 'a' }]).valid).toBe(false);
  });
});

describe('computeBalances', () => {
  const expense = (
    id: string,
    amount: number,
    paidBy: string,
    participants: ParticipantShare[],
  ): Expense => ({
    id,
    type: 'expense',
    description: id,
    amount,
    paidBy,
    participants,
    splitMethod: 'equal',
    category: 'other',
    date: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  it('credits the payer and debits each participant', () => {
    const balances = computeBalances(
      [expense('e1', 900, 'a', splitEqual(900, ['a', 'b', 'c']))],
      [],
      ['a', 'b', 'c'],
    );
    expect(balances).toEqual({ a: 600, b: -300, c: -300 });
  });

  it('lets a settlement move a debtor back towards zero', () => {
    const settlement: Settlement = {
      id: 's1',
      type: 'settlement',
      from: 'b',
      to: 'a',
      amount: 300,
      date: '2026-01-02',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const balances = computeBalances(
      [expense('e1', 900, 'a', splitEqual(900, ['a', 'b', 'c']))],
      [settlement],
      ['a', 'b', 'c'],
    );
    expect(balances).toEqual({ a: 300, b: 0, c: -300 });
  });

  it('always nets to zero across randomly generated ledgers', () => {
    const people = ids(6);
    for (let run = 0; run < 200; run += 1) {
      const expenses: Expense[] = [];
      const count = 1 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i += 1) {
        const amount = 1 + Math.floor(Math.random() * 99_999);
        const involved = people.filter(() => Math.random() > 0.35);
        const participants = involved.length ? involved : [people[0]];
        expenses.push(
          expense(
            `e${i}`,
            amount,
            people[Math.floor(Math.random() * people.length)],
            splitEqual(amount, participants),
          ),
        );
      }
      const balances = computeBalances(expenses, [], people);
      expect(Object.values(balances).reduce((total, v) => total + v, 0)).toBe(0);
    }
  });
});
