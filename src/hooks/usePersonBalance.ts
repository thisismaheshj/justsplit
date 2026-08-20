import { useGroupStore } from '@/store/useGroupStore';
import { selectBalances } from '@/store/selectors';
import { useMemo } from 'react';
import type { BalanceMap } from '@/types';

/** Every person's net balance, recomputed from the current ledger. */
export function useBalances(): BalanceMap {
  const expenses = useGroupStore((s) => s.expenses);
  const settlements = useGroupStore((s) => s.settlements);
  const people = useGroupStore((s) => s.people);

  return useMemo(
    () => selectBalances({ expenses, settlements, people }),
    [expenses, settlements, people],
  );
}

/** A single person's net balance. Positive = is owed, negative = owes. */
export function usePersonBalance(personId: string | undefined): number {
  const balances = useBalances();
  return personId ? (balances[personId] ?? 0) : 0;
}
