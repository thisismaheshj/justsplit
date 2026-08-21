import type { AppState } from '@/types';

/**
 * The pre-Phase-4 browser-only store. Nothing writes here any more, but the
 * key is deliberately left untouched so a returning user's group can still be
 * imported. It is only cleared once they have explicitly imported or dismissed
 * it — losing someone's ledger to a silent cleanup would be unforgivable.
 */
export const LEGACY_STORAGE_KEY = 'splitgroup-app-state-v1';
export const LEGACY_DISMISSED_KEY = 'splitgroup-legacy-dismissed';

export interface LegacySnapshot {
  state: AppState;
  expenseCount: number;
  peopleCount: number;
}

/** Reads the old local group, or null if there is nothing worth importing. */
export function readLegacyGroup(): LegacySnapshot | null {
  try {
    if (localStorage.getItem(LEGACY_DISMISSED_KEY) === '1') return null;
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { state?: Partial<AppState> };
    const state = parsed?.state;
    if (!state?.group || !Array.isArray(state.people) || state.people.length === 0) return null;

    const full: AppState = {
      group: state.group,
      people: state.people,
      expenses: state.expenses ?? [],
      settlements: state.settlements ?? [],
      recurringExpenses: state.recurringExpenses ?? [],
      categories: state.categories ?? [],
    };

    return {
      state: full,
      expenseCount: full.expenses.length,
      peopleCount: full.people.length,
    };
  } catch {
    // Corrupt or unreadable local data should never block signing in.
    return null;
  }
}

/** Marks the local group as dealt with. The data itself is left in place. */
export function dismissLegacyGroup(): void {
  try {
    localStorage.setItem(LEGACY_DISMISSED_KEY, '1');
  } catch {
    /* storage unavailable; the prompt simply reappears next time */
  }
}
