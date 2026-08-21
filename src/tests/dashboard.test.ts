import { describe, expect, it } from 'vitest';
import { totalsByCurrency, type DashboardGroup } from '@/lib/dashboardApi';

function group(overrides: Partial<DashboardGroup>): DashboardGroup {
  return {
    groupId: overrides.groupId ?? crypto.randomUUID(),
    name: 'Group',
    currency: 'INR',
    memberCount: 2,
    expenseCount: 1,
    totalSpend: 0,
    myBalance: 0,
    lastActivity: null,
    ...overrides,
  };
}

describe('totalsByCurrency', () => {
  it('returns nothing when there are no groups', () => {
    expect(totalsByCurrency([])).toEqual([]);
  });

  /**
   * The whole point of the per-currency decision: rupees and dollars must never
   * land in the same total, because converting them would need a rate the app
   * deliberately does not have.
   */
  it('never mixes currencies into one figure', () => {
    const totals = totalsByCurrency([
      group({ currency: 'INR', myBalance: 120_000 }),
      group({ currency: 'USD', myBalance: -3_000 }),
    ]);

    expect(totals).toHaveLength(2);
    const inr = totals.find((t) => t.currency === 'INR')!;
    const usd = totals.find((t) => t.currency === 'USD')!;
    expect(inr.net).toBe(120_000);
    expect(usd.net).toBe(-3_000);
  });

  it('nets several groups sharing a currency', () => {
    const [total] = totalsByCurrency([
      group({ currency: 'INR', myBalance: 50_000 }),
      group({ currency: 'INR', myBalance: -20_000 }),
      group({ currency: 'INR', myBalance: 5_000 }),
    ]);

    expect(total.currency).toBe('INR');
    expect(total.groupCount).toBe(3);
    expect(total.net).toBe(35_000);
    // The gross figures are kept separate so the card can say "X in, Y out"
    // rather than only showing a net that hides both.
    expect(total.owedToYou).toBe(55_000);
    expect(total.youOwe).toBe(20_000);
  });

  it('reports a settled currency as exactly zero, not as noise', () => {
    const [total] = totalsByCurrency([
      group({ currency: 'EUR', myBalance: 10_000 }),
      group({ currency: 'EUR', myBalance: -10_000 }),
    ]);
    expect(total.net).toBe(0);
    expect(total.owedToYou).toBe(10_000);
    expect(total.youOwe).toBe(10_000);
  });

  it('counts a zero-balance group without adding to either side', () => {
    const [total] = totalsByCurrency([group({ currency: 'GBP', myBalance: 0 })]);
    expect(total).toMatchObject({ net: 0, owedToYou: 0, youOwe: 0, groupCount: 1 });
  });

  it('puts the currency you have most at stake in first', () => {
    const totals = totalsByCurrency([
      group({ currency: 'INR', myBalance: 1_000 }),
      group({ currency: 'USD', myBalance: -90_000 }),
      group({ currency: 'EUR', myBalance: 20_000 }),
    ]);
    expect(totals.map((t) => t.currency)).toEqual(['USD', 'EUR', 'INR']);
  });

  it('keeps every amount an integer in minor units', () => {
    const totals = totalsByCurrency([
      group({ currency: 'INR', myBalance: 33_334 }),
      group({ currency: 'INR', myBalance: -33_333 }),
    ]);
    for (const value of [totals[0].net, totals[0].owedToYou, totals[0].youOwe]) {
      expect(Number.isInteger(value)).toBe(true);
    }
    expect(totals[0].net).toBe(1);
  });
});
