import type { BalanceMap, DebtTransfer } from '@/types';

/**
 * 8.2 — Greedy debt simplification.
 * Repeatedly matches the largest debtor against the largest creditor, which
 * settles at least one person per step and therefore emits at most n-1
 * transfers for n people with a nonzero balance.
 */
export function simplifyDebts(balances: BalanceMap): DebtTransfer[] {
  const creditors = Object.entries(balances)
    .filter(([, value]) => value > 0)
    .map(([id, value]) => ({ id, remaining: value }))
    .sort((a, b) => (b.remaining === a.remaining ? a.id.localeCompare(b.id) : b.remaining - a.remaining));

  const debtors = Object.entries(balances)
    .filter(([, value]) => value < 0)
    .map(([id, value]) => ({ id, remaining: value }))
    .sort((a, b) => (a.remaining === b.remaining ? a.id.localeCompare(b.id) : a.remaining - b.remaining));

  const result: DebtTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.remaining, creditor.remaining);

    if (amount > 0) {
      result.push({ from: debtor.id, to: creditor.id, amount });
      debtor.remaining += amount;
      creditor.remaining -= amount;
    }

    if (debtor.remaining === 0) i += 1;
    if (creditor.remaining === 0) j += 1;
  }

  return result;
}

/** Find the suggested transfer between a specific pair, if one exists. */
export function findSuggestedTransfer(
  transfers: DebtTransfer[],
  from: string,
  to: string,
): DebtTransfer | undefined {
  return transfers.find((t) => t.from === from && t.to === to);
}

/** How much this person still needs to pay out, per the simplified plan. */
export function transfersFrom(transfers: DebtTransfer[], personId: string): DebtTransfer[] {
  return transfers.filter((t) => t.from === personId);
}

/** How much this person is still due to receive, per the simplified plan. */
export function transfersTo(transfers: DebtTransfer[], personId: string): DebtTransfer[] {
  return transfers.filter((t) => t.to === personId);
}

/** Apply transfers to balances — used in tests to prove everything zeroes out. */
export function applyTransfers(balances: BalanceMap, transfers: DebtTransfer[]): BalanceMap {
  const next: BalanceMap = { ...balances };
  for (const t of transfers) {
    next[t.from] = (next[t.from] ?? 0) + t.amount;
    next[t.to] = (next[t.to] ?? 0) - t.amount;
  }
  return next;
}
