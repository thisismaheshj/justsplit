import type { AppState, Expense, ParticipantInput, RecurringExpense, Settlement, SplitMethod } from '@/types';
import { computeSplit } from '@/lib/calculations';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { colorFromString } from '@/lib/avatar';
import { addDaysStr, addMonthsClamped, todayString } from '@/lib/date';
import { anchorDayOf, nextOccurrence } from '@/lib/recurring';
import { generateId } from '@/lib/id';

/**
 * A realistic "Goa Trip" demo group for development and QA.
 * Dates are generated relative to today so the demo never goes stale.
 */

interface SeedExpense {
  daysAgo: number;
  description: string;
  /** major units, e.g. 4200.50 */
  amount: number;
  payer: number;
  category: string;
  method: SplitMethod;
  /** indices into the people array */
  who: number[];
  /** inputValue per participant, in the same order as `who` */
  values?: number[];
  note?: string;
}

const PEOPLE = ['Mahesh', 'Rahul', 'Amit', 'Priya'];

const SEED_EXPENSES: SeedExpense[] = [
  { daysAgo: 20, description: 'Flights to Goa', amount: 24800, payer: 0, category: 'transport', method: 'equal', who: [0, 1, 2, 3] },
  { daysAgo: 19, description: 'Beach shack lunch', amount: 3450, payer: 2, category: 'food', method: 'equal', who: [0, 1, 2, 3], note: 'Prawn curry was worth it' },
  { daysAgo: 19, description: 'Airport taxi', amount: 1900, payer: 1, category: 'transport', method: 'equal', who: [0, 1, 2, 3] },
  { daysAgo: 18, description: 'Resort — 3 nights', amount: 42000, payer: 3, category: 'hotel', method: 'shares', who: [0, 1, 2, 3], values: [1, 1, 1, 2], note: 'Priya took the sea-view suite' },
  { daysAgo: 17, description: 'Groceries & breakfast supplies', amount: 2860, payer: 0, category: 'groceries', method: 'equal', who: [0, 1, 2, 3] },
  { daysAgo: 16, description: 'Scooter rental', amount: 3200, payer: 1, category: 'transport', method: 'equal', who: [1, 2, 3] },
  { daysAgo: 15, description: 'Dinner at Thalassa', amount: 7650, payer: 2, category: 'food', method: 'exact', who: [0, 1, 2, 3], values: [2100, 1850, 1900, 1800] },
  { daysAgo: 14, description: 'Water sports at Baga', amount: 6000, payer: 0, category: 'entertainment', method: 'percentage', who: [0, 1, 2], values: [40, 30, 30] },
  { daysAgo: 12, description: 'Souvenir shopping', amount: 4300, payer: 3, category: 'shopping', method: 'equal', who: [0, 3] },
  { daysAgo: 11, description: 'Club night cover charge', amount: 5200, payer: 1, category: 'entertainment', method: 'equal', who: [0, 1, 2, 3] },
  { daysAgo: 9, description: 'Sunset cruise tickets', amount: 4800, payer: 2, category: 'entertainment', method: 'equal', who: [0, 1, 2, 3] },
  { daysAgo: 7, description: 'Fuel top-up', amount: 1250.5, payer: 1, category: 'transport', method: 'equal', who: [1, 2, 3] },
  { daysAgo: 5, description: 'Mobile data recharge', amount: 999, payer: 0, category: 'bills', method: 'equal', who: [0, 1, 2, 3] },
  { daysAgo: 3, description: 'Farewell seafood dinner', amount: 9120, payer: 3, category: 'food', method: 'shares', who: [0, 1, 2, 3], values: [2, 1, 1, 1] },
  { daysAgo: 1, description: 'Return airport drop', amount: 2100, payer: 2, category: 'transport', method: 'equal', who: [0, 1, 2, 3] },
];

interface SeedSettlement {
  daysAgo: number;
  from: number;
  to: number;
  amount: number;
  note?: string;
}

const SEED_SETTLEMENTS: SeedSettlement[] = [
  { daysAgo: 10, from: 1, to: 0, amount: 6000, note: 'UPI' },
  { daysAgo: 6, from: 2, to: 3, amount: 4500, note: 'Cash at the resort' },
  { daysAgo: 2, from: 1, to: 3, amount: 2500 },
];

/** Builds the full demo AppState. Pure — the store just commits it. */
export function buildSeedData(today = todayString()): AppState {
  const createdAt = new Date().toISOString();

  const people = PEOPLE.map((name) => {
    const id = generateId();
    return { id, name, avatarColor: colorFromString(id), createdAt };
  });

  const toMinor = (major: number) => Math.round(major * 100);

  const expenses: Expense[] = SEED_EXPENSES.map((seed) => {
    const amount = toMinor(seed.amount);
    const entries: ParticipantInput[] = seed.who.map((personIndex, i) => ({
      personId: people[personIndex].id,
      inputValue: seed.values
        ? seed.method === 'exact'
          ? toMinor(seed.values[i])
          : seed.values[i]
        : undefined,
    }));

    return {
      id: generateId(),
      type: 'expense',
      description: seed.description,
      amount,
      paidBy: people[seed.payer].id,
      participants: computeSplit(seed.method, amount, entries),
      splitMethod: seed.method,
      category: seed.category,
      date: addDaysStr(today, -seed.daysAgo),
      note: seed.note,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const settlements: Settlement[] = SEED_SETTLEMENTS.map((seed) => ({
    id: generateId(),
    type: 'settlement',
    from: people[seed.from].id,
    to: people[seed.to].id,
    amount: toMinor(seed.amount),
    date: addDaysStr(today, -seed.daysAgo),
    note: seed.note,
    createdAt,
    updatedAt: createdAt,
  }));

  // Monthly rent: ₹30,000 paid by Mahesh, split 50/50 with Rahul.
  const rentAmount = toMinor(30000);
  const rentStart = addMonthsClamped(today, -2);
  const rentEntries: ParticipantInput[] = [
    { personId: people[0].id, inputValue: 50 },
    { personId: people[1].id, inputValue: 50 },
  ];
  const rentTemplateId = generateId();
  const rentParticipants = computeSplit('percentage', rentAmount, rentEntries);

  // Walk the template forward from its start date, recording each occurrence
  // that has already fallen due — the demo should look like it has been in use.
  let rentNextDue = rentStart;
  const anchor = anchorDayOf(rentStart);
  let guard = 0;
  while (rentNextDue <= today && guard < 60) {
    expenses.push({
      id: generateId(),
      type: 'expense',
      description: 'Rent',
      amount: rentAmount,
      paidBy: people[0].id,
      participants: rentParticipants,
      splitMethod: 'percentage',
      category: 'rent',
      date: rentNextDue,
      note: 'Flat share with Rahul',
      recurringExpenseId: rentTemplateId,
      createdAt,
      updatedAt: createdAt,
    });
    rentNextDue = nextOccurrence(rentNextDue, 'monthly', anchor);
    guard += 1;
  }

  const recurringExpenses: RecurringExpense[] = [
    {
      id: rentTemplateId,
      description: 'Rent',
      amount: rentAmount,
      paidBy: people[0].id,
      participants: rentParticipants,
      splitMethod: 'percentage',
      category: 'rent',
      frequency: 'monthly',
      startDate: rentStart,
      nextDueDate: rentNextDue,
      active: true,
      note: 'Flat share with Rahul',
      createdAt,
      updatedAt: createdAt,
    },
  ];

  return {
    group: { id: generateId(), name: 'Goa Trip', currency: 'INR', createdAt },
    people,
    expenses,
    settlements,
    recurringExpenses,
    categories: DEFAULT_CATEGORIES,
  };
}
