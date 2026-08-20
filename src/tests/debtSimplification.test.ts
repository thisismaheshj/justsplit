import { describe, expect, it } from 'vitest';
import { applyTransfers, simplifyDebts } from '@/lib/debtSimplification';
import { computeBalances, splitEqual } from '@/lib/calculations';
import type { BalanceMap, Expense } from '@/types';

const netOf = (balances: BalanceMap) =>
  Object.values(balances).reduce((total, v) => total + v, 0);

const nonZeroCount = (balances: BalanceMap) =>
  Object.values(balances).filter((v) => v !== 0).length;

describe('simplifyDebts', () => {
  it('returns nothing when everyone is settled', () => {
    expect(simplifyDebts({ a: 0, b: 0, c: 0 })).toEqual([]);
  });

  it('handles a single person group', () => {
    expect(simplifyDebts({ a: 0 })).toEqual([]);
  });

  it('handles one debtor paying one creditor', () => {
    expect(simplifyDebts({ a: 500, b: -500 })).toEqual([{ from: 'b', to: 'a', amount: 500 }]);
  });

  it('splits one debtor across several creditors', () => {
    const transfers = simplifyDebts({ a: 300, b: 200, c: -500 });
    expect(transfers).toEqual([
      { from: 'c', to: 'a', amount: 300 },
      { from: 'c', to: 'b', amount: 200 },
    ]);
  });

  it('collects several debtors into one creditor', () => {
    const transfers = simplifyDebts({ a: 500, b: -200, c: -300 });
    expect(transfers.every((t) => t.to === 'a')).toBe(true);
    expect(transfers.reduce((sum, t) => sum + t.amount, 0)).toBe(500);
  });

  it('zeroes every balance once the transfers are applied', () => {
    const balances = { a: 1250, b: -400, c: -850 };
    const after = applyTransfers(balances, simplifyDebts(balances));
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });

  it('never emits more than n-1 transfers, and always clears the ledger', () => {
    for (let run = 0; run < 300; run += 1) {
      const size = 2 + Math.floor(Math.random() * 7);
      const balances: BalanceMap = {};
      let running = 0;
      for (let i = 0; i < size - 1; i += 1) {
        const value = Math.floor(Math.random() * 20_001) - 10_000;
        balances[`p${i}`] = value;
        running += value;
      }
      // The last balance absorbs the rest so the ledger nets to zero.
      balances[`p${size - 1}`] = -running;

      expect(netOf(balances)).toBe(0);

      const transfers = simplifyDebts(balances);
      const n = nonZeroCount(balances);
      expect(transfers.length).toBeLessThanOrEqual(Math.max(0, n - 1));

      const after = applyTransfers(balances, transfers);
      expect(netOf(after)).toBe(0);
      expect(Object.values(after).every((v) => v === 0)).toBe(true);
    }
  });

  it('produces amounts that are always strictly positive', () => {
    const transfers = simplifyDebts({ a: 100, b: 0, c: -100 });
    expect(transfers.every((t) => t.amount > 0)).toBe(true);
    expect(transfers.some((t) => t.from === 'b' || t.to === 'b')).toBe(false);
  });

  it('works end to end from a real ledger', () => {
    const people = ['mahesh', 'rahul', 'amit', 'priya'];
    const mkExpense = (id: string, amount: number, paidBy: string, who: string[]): Expense => ({
      id,
      type: 'expense',
      description: id,
      amount,
      paidBy,
      participants: splitEqual(amount, who),
      splitMethod: 'equal',
      category: 'other',
      date: '2026-02-01',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });

    const expenses = [
      mkExpense('e1', 240_000, 'mahesh', people),
      mkExpense('e2', 34_500, 'amit', people),
      mkExpense('e3', 100_000, 'priya', ['mahesh', 'priya']),
    ];

    const balances = computeBalances(expenses, [], people);
    expect(netOf(balances)).toBe(0);

    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(people.length - 1);

    const after = applyTransfers(balances, transfers);
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });
});
