import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AppState,
  Category,
  ExpenseInput,
  Expense,
  Person,
  RecurringExpense,
  RecurringInput,
  Settlement,
  SettlementInput,
} from '@/types';
import { computeSplit } from '@/lib/calculations';
import { generateDueRecurringExpenses, anchorDayOf, nextOccurrence } from '@/lib/recurring';
import { DEFAULT_CATEGORIES, categoryIdFromLabel, isDefaultCategory } from '@/lib/categories';
import { colorFromString } from '@/lib/avatar';
import { generateId } from '@/lib/id';
import { todayString } from '@/lib/date';
import { buildSeedData } from '@/lib/seedData';

export const STORAGE_KEY = 'splitgroup-app-state-v1';
export const STORAGE_VERSION = 1;

export interface GroupStore extends AppState {
  /** Flipped true once the persisted state has been read back. */
  hydrated: boolean;
  setHydrated: (value: boolean) => void;

  // Setup
  initializeGroup: (
    groupName: string,
    currency: string,
    people: { name: string; avatarPhoto?: string }[],
  ) => void;

  // People
  addPerson: (name: string, avatarPhoto?: string) => string;
  updatePerson: (id: string, updates: Partial<Pick<Person, 'name' | 'avatarPhoto'>>) => void;
  removePerson: (id: string) => void;

  // Expenses
  addExpense: (input: ExpenseInput) => string;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;

  // Settlements
  addSettlement: (input: SettlementInput) => string;
  updateSettlement: (id: string, input: SettlementInput) => void;
  deleteSettlement: (id: string) => void;

  // Recurring
  addRecurringExpense: (input: RecurringInput) => string;
  updateRecurringExpense: (id: string, input: RecurringInput) => void;
  toggleRecurringActive: (id: string, active: boolean) => void;
  deleteRecurringExpense: (id: string) => void;
  runDueRecurringCheck: () => number;

  // Categories
  addCustomCategory: (label: string, icon: string) => void;
  removeCustomCategory: (id: string) => void;

  // Settings
  updateGroupName: (name: string) => void;
  updateCurrency: (currencyCode: string) => void;
  loadSeedData: () => void;
  resetAll: () => void;
}

const emptyState: AppState = {
  group: null,
  people: [],
  expenses: [],
  settlements: [],
  recurringExpenses: [],
  categories: DEFAULT_CATEGORIES,
};

function now(): string {
  return new Date().toISOString();
}

function makePerson(name: string, avatarPhoto?: string): Person {
  const id = generateId();
  return {
    id,
    name: name.trim(),
    avatarPhoto,
    avatarColor: colorFromString(id),
    createdAt: now(),
  };
}

/**
 * Builds a stored Expense from raw form input. All split maths lives in
 * lib/calculations — the store only commits the result.
 */
function buildExpense(input: ExpenseInput, existing?: Expense): Expense {
  const participants = computeSplit(input.splitMethod, input.amount, input.participants);
  return {
    id: existing?.id ?? generateId(),
    type: 'expense',
    description: input.description.trim(),
    amount: input.amount,
    paidBy: input.paidBy,
    participants,
    splitMethod: input.splitMethod,
    category: input.category,
    date: input.date,
    note: input.note?.trim() || undefined,
    recurringExpenseId: input.recurringExpenseId ?? existing?.recurringExpenseId,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
}

function buildSettlement(input: SettlementInput, existing?: Settlement): Settlement {
  return {
    id: existing?.id ?? generateId(),
    type: 'settlement',
    from: input.from,
    to: input.to,
    amount: input.amount,
    date: input.date,
    note: input.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
}

/**
 * True when saving a template should also record its first occurrence right
 * away (i.e. the start date is today or earlier).
 */
export function shouldCreateFirstOccurrence(startDate: string): boolean {
  return startDate <= todayString();
}

function buildRecurring(input: RecurringInput, existing?: RecurringExpense): RecurringExpense {
  // Validate the template split up-front so generated instances can never fail.
  const participants = computeSplit(input.splitMethod, input.amount, input.participants);

  // When the caller has already recorded the start-date occurrence as a normal
  // expense, the template schedules from the *following* cycle. Otherwise the
  // start date itself is the first thing due.
  let nextDueDate = existing?.nextDueDate ?? input.startDate;
  if (!existing) {
    nextDueDate = input.firstOccurrenceCreated
      ? nextOccurrence(input.startDate, input.frequency, anchorDayOf(input.startDate))
      : input.startDate;
  } else if (existing.startDate !== input.startDate || existing.frequency !== input.frequency) {
    // Start date or cadence changed — recompute the schedule from the new start.
    const anchor = anchorDayOf(input.startDate);
    let due = input.startDate;
    const today = todayString();
    let guard = 0;
    while (due <= today && guard < 500) {
      due = nextOccurrence(due, input.frequency, anchor);
      guard += 1;
    }
    nextDueDate = due;
  }

  const active = input.active ?? existing?.active ?? true;

  return {
    id: existing?.id ?? generateId(),
    description: input.description.trim(),
    amount: input.amount,
    paidBy: input.paidBy,
    participants,
    splitMethod: input.splitMethod,
    category: input.category,
    frequency: input.frequency,
    startDate: input.startDate,
    nextDueDate,
    endDate: input.endDate || undefined,
    active: input.endDate && nextDueDate > input.endDate ? false : active,
    note: input.note?.trim() || undefined,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      ...emptyState,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      /* ------------------------------ Setup ------------------------------ */

      initializeGroup: (groupName, currency, people) =>
        set({
          group: {
            id: generateId(),
            name: groupName.trim(),
            currency,
            createdAt: now(),
          },
          people: people
            .filter((p) => p.name.trim())
            .map((p) => makePerson(p.name, p.avatarPhoto)),
          expenses: [],
          settlements: [],
          recurringExpenses: [],
          categories: DEFAULT_CATEGORIES,
        }),

      /* ------------------------------ People ----------------------------- */

      addPerson: (name, avatarPhoto) => {
        const person = makePerson(name, avatarPhoto);
        set((state) => ({ people: [...state.people, person] }));
        return person.id;
      },

      updatePerson: (id, updates) =>
        set((state) => ({
          people: state.people.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...('name' in updates && updates.name !== undefined
                    ? { name: updates.name.trim() }
                    : {}),
                  ...('avatarPhoto' in updates ? { avatarPhoto: updates.avatarPhoto } : {}),
                }
              : p,
          ),
        })),

      /**
       * Soft-remove: a person with any history is archived so historical
       * participant references stay valid. Someone with no history at all is
       * deleted outright. The last active person can never be removed.
       */
      removePerson: (id) => {
        const state = get();
        const activeCount = state.people.filter((p) => !p.archived).length;
        if (activeCount <= 1) return;

        const hasHistory =
          state.expenses.some(
            (e) => e.paidBy === id || e.participants.some((p) => p.personId === id),
          ) ||
          state.settlements.some((s) => s.from === id || s.to === id) ||
          state.recurringExpenses.some(
            (r) => r.paidBy === id || r.participants.some((p) => p.personId === id),
          );

        if (hasHistory) {
          set({
            people: state.people.map((p) => (p.id === id ? { ...p, archived: true } : p)),
            // Pause any template that depended on this person.
            recurringExpenses: state.recurringExpenses.map((r) =>
              r.paidBy === id || r.participants.some((p) => p.personId === id)
                ? { ...r, active: false, updatedAt: now() }
                : r,
            ),
          });
        } else {
          set({ people: state.people.filter((p) => p.id !== id) });
        }
      },

      /* ----------------------------- Expenses ---------------------------- */

      addExpense: (input) => {
        const expense = buildExpense(input);
        set((state) => ({ expenses: [...state.expenses, expense] }));
        return expense.id;
      },

      updateExpense: (id, input) =>
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? buildExpense(input, e) : e)),
        })),

      deleteExpense: (id) =>
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

      /* ---------------------------- Settlements -------------------------- */

      addSettlement: (input) => {
        const settlement = buildSettlement(input);
        set((state) => ({ settlements: [...state.settlements, settlement] }));
        return settlement.id;
      },

      updateSettlement: (id, input) =>
        set((state) => ({
          settlements: state.settlements.map((s) => (s.id === id ? buildSettlement(input, s) : s)),
        })),

      deleteSettlement: (id) =>
        set((state) => ({ settlements: state.settlements.filter((s) => s.id !== id) })),

      /* ----------------------------- Recurring --------------------------- */

      addRecurringExpense: (input) => {
        const template = buildRecurring(input);
        set((state) => ({ recurringExpenses: [...state.recurringExpenses, template] }));
        return template.id;
      },

      updateRecurringExpense: (id, input) =>
        set((state) => ({
          recurringExpenses: state.recurringExpenses.map((r) =>
            r.id === id ? buildRecurring(input, r) : r,
          ),
        })),

      toggleRecurringActive: (id, active) =>
        set((state) => ({
          recurringExpenses: state.recurringExpenses.map((r) =>
            r.id === id ? { ...r, active, updatedAt: now() } : r,
          ),
        })),

      /** Deleting a template leaves already-generated expenses untouched. */
      deleteRecurringExpense: (id) =>
        set((state) => ({
          recurringExpenses: state.recurringExpenses.filter((r) => r.id !== id),
        })),

      runDueRecurringCheck: () => {
        const state = get();
        if (!state.group) return 0;

        const results = generateDueRecurringExpenses(state.recurringExpenses, todayString());
        const ids = Object.keys(results);
        if (ids.length === 0) return 0;

        const newExpenses: Expense[] = [];
        for (const id of ids) {
          for (const input of results[id].expenses) {
            newExpenses.push(buildExpense(input));
          }
        }

        set({
          expenses: newExpenses.length ? [...state.expenses, ...newExpenses] : state.expenses,
          recurringExpenses: state.recurringExpenses.map((r) => {
            const generated = results[r.id];
            if (!generated) return r;
            return {
              ...r,
              nextDueDate: generated.nextDueDate,
              active: generated.active,
              updatedAt: now(),
            };
          }),
        });

        return newExpenses.length;
      },

      /* ---------------------------- Categories --------------------------- */

      addCustomCategory: (label, icon) =>
        set((state) => {
          const id = categoryIdFromLabel(
            label,
            state.categories.map((c) => c.id),
          );
          const category: Category = { id, label: label.trim(), icon, isCustom: true };
          return { categories: [...state.categories, category] };
        }),

      /** Default categories are permanent; expenses using a removed custom
       *  category fall back to "other" so nothing dangles. */
      removeCustomCategory: (id) =>
        set((state) => {
          if (isDefaultCategory(id)) return state;
          return {
            categories: state.categories.filter((c) => c.id !== id),
            expenses: state.expenses.map((e) =>
              e.category === id ? { ...e, category: 'other', updatedAt: now() } : e,
            ),
            recurringExpenses: state.recurringExpenses.map((r) =>
              r.category === id ? { ...r, category: 'other', updatedAt: now() } : r,
            ),
          };
        }),

      /* ----------------------------- Settings ---------------------------- */

      updateGroupName: (name) =>
        set((state) => ({
          group: state.group ? { ...state.group, name: name.trim() } : state.group,
        })),

      /** Relabels formatting only — stored minor-unit amounts are untouched. */
      updateCurrency: (currencyCode) =>
        set((state) => ({
          group: state.group ? { ...state.group, currency: currencyCode } : state.group,
        })),

      loadSeedData: () => set({ ...buildSeedData(), hydrated: true }),

      resetAll: () => {
        set({ ...emptyState, hydrated: true });
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* storage unavailable — in-memory reset is enough */
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): AppState => ({
        group: state.group,
        people: state.people,
        expenses: state.expenses,
        settlements: state.settlements,
        recurringExpenses: state.recurringExpenses,
        categories: state.categories,
      }),
      /** No-op today; the hook is here so future schema bumps have a home. */
      migrate: (persisted, version) => {
        let state = persisted as Partial<AppState> | undefined;
        if (!state) return { ...emptyState };
        if (version < 1) {
          state = { ...emptyState, ...state };
        }
        return { ...emptyState, ...state } as AppState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
