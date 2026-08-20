import type {
  BalanceMap,
  Expense,
  ParticipantInput,
  ParticipantShare,
  Settlement,
  SplitMethod,
} from '@/types';

/**
 * All money here is integer minor units. Every split function guarantees
 *   sum(result[i].amountOwed) === amount
 * exactly, with a deterministic remainder distribution.
 */

export class SplitError extends Error {}

function assertAmount(amount: number) {
  if (!Number.isInteger(amount)) throw new SplitError('Amount must be an integer in minor units');
  if (amount <= 0) throw new SplitError('Amount must be greater than zero');
}

function assertParticipants(count: number) {
  if (count < 1) throw new SplitError('At least one participant is required');
}

/**
 * Largest-remainder apportionment. `weights` are non-negative numbers; the
 * result sums exactly to `amount`. Extra minor units go to the largest
 * fractional remainders, ties broken by original participant order.
 */
function largestRemainder(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) throw new SplitError('Split weights must add up to more than zero');

  const exact = weights.map((w) => (amount * w) / totalWeight);
  const floored = exact.map((v) => Math.floor(v));
  let remainder = amount - floored.reduce((sum, v) => sum + v, 0);

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => (b.frac === a.frac ? a.index - b.index : b.frac - a.frac));

  const result = [...floored];
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    result[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return result;
}

/** 7.1 — floor share, remainder of 1 minor unit each to the first N participants. */
export function splitEqual(amount: number, participantIds: string[]): ParticipantShare[] {
  assertAmount(amount);
  assertParticipants(participantIds.length);

  const count = participantIds.length;
  const share = Math.floor(amount / count);
  let remainder = amount - share * count;

  return participantIds.map((personId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { personId, amountOwed: share + extra };
  });
}

/** 7.2 — exact minor-unit amounts; must sum to the total exactly. */
export function splitExact(amount: number, entries: ParticipantInput[]): ParticipantShare[] {
  assertAmount(amount);
  assertParticipants(entries.length);

  const values = entries.map((e) => e.inputValue ?? 0);
  if (values.some((v) => !Number.isInteger(v) || v < 0)) {
    throw new SplitError('Exact amounts must be whole, non-negative minor-unit values');
  }
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total !== amount) {
    throw new SplitError(`Exact amounts must add up to the total (off by ${amount - total})`);
  }
  return entries.map((e, i) => ({
    personId: e.personId,
    inputValue: values[i],
    amountOwed: values[i],
  }));
}

/** 7.3 — percentages (0-100, up to 2dp) summing to exactly 100.00. */
export function splitPercentage(amount: number, entries: ParticipantInput[]): ParticipantShare[] {
  assertAmount(amount);
  assertParticipants(entries.length);

  const values = entries.map((e) => e.inputValue ?? 0);
  if (values.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new SplitError('Percentages must be non-negative numbers');
  }
  // Work in hundredths of a percent so 2dp input compares exactly.
  const basisPoints = values.map((v) => Math.round(v * 100));
  const total = basisPoints.reduce((sum, v) => sum + v, 0);
  if (total !== 10_000) {
    throw new SplitError(`Percentages must add up to 100% (currently ${total / 100}%)`);
  }

  const amounts = largestRemainder(amount, basisPoints);
  return entries.map((e, i) => ({
    personId: e.personId,
    inputValue: values[i],
    amountOwed: amounts[i],
  }));
}

/** 7.4 — positive integer share units. */
export function splitShares(amount: number, entries: ParticipantInput[]): ParticipantShare[] {
  assertAmount(amount);
  assertParticipants(entries.length);

  const values = entries.map((e) => e.inputValue ?? 1);
  if (values.some((v) => !Number.isInteger(v) || v < 1)) {
    throw new SplitError('Each share must be a whole number of 1 or more');
  }

  const amounts = largestRemainder(amount, values);
  return entries.map((e, i) => ({
    personId: e.personId,
    inputValue: values[i],
    amountOwed: amounts[i],
  }));
}

/** Dispatch to the right split algorithm. Throws SplitError on invalid input. */
export function computeSplit(
  method: SplitMethod,
  amount: number,
  entries: ParticipantInput[],
): ParticipantShare[] {
  switch (method) {
    case 'equal':
      return splitEqual(amount, entries.map((e) => e.personId));
    case 'exact':
      return splitExact(amount, entries);
    case 'percentage':
      return splitPercentage(amount, entries);
    case 'shares':
      return splitShares(amount, entries);
    default:
      throw new SplitError(`Unknown split method: ${method as string}`);
  }
}

/**
 * 8.1 — Net balance per person.
 * Positive = net creditor (is owed). Negative = net debtor (owes).
 * The sum across all people is always exactly 0.
 */
export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[],
  personIds: string[],
): BalanceMap {
  const balances: BalanceMap = {};
  for (const id of personIds) balances[id] = 0;
  const bump = (id: string, delta: number) => {
    balances[id] = (balances[id] ?? 0) + delta;
  };

  for (const expense of expenses) {
    bump(expense.paidBy, expense.amount);
    for (const p of expense.participants) bump(p.personId, -p.amountOwed);
  }

  for (const settlement of settlements) {
    bump(settlement.from, settlement.amount);
    bump(settlement.to, -settlement.amount);
  }

  return balances;
}

/** Total of all expense amounts (settlements are transfers, not spend). */
export function totalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** What a single person owes on a given expense (0 if not a participant). */
export function amountOwedBy(expense: Expense, personId: string): number {
  return expense.participants.find((p) => p.personId === personId)?.amountOwed ?? 0;
}

/** Net effect of one expense on one person's balance. */
export function expenseNetFor(expense: Expense, personId: string): number {
  const paid = expense.paidBy === personId ? expense.amount : 0;
  return paid - amountOwedBy(expense, personId);
}

/** Net effect of one settlement on one person's balance. */
export function settlementNetFor(settlement: Settlement, personId: string): number {
  if (settlement.from === personId) return settlement.amount;
  if (settlement.to === personId) return -settlement.amount;
  return 0;
}
