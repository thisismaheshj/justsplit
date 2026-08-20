import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { computeSplit } from '@/lib/calculations';
import type { AppState, Expense, Person, Settlement, SplitMethod } from '@/types';

export function makePerson(id: string, name: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    name,
    avatarColor: '#4f46e5',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeExpense(
  id: string,
  amount: number,
  paidBy: string,
  participantIds: string[],
  overrides: Partial<Expense> = {},
): Expense {
  return {
    id,
    type: 'expense',
    description: `Expense ${id}`,
    amount,
    paidBy,
    participants: computeSplit(
      (overrides.splitMethod ?? 'equal') as SplitMethod,
      amount,
      participantIds.map((personId) => ({ personId })),
    ),
    splitMethod: 'equal',
    category: 'food',
    date: '2026-05-10',
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
    ...overrides,
  };
}

export function makeSettlement(
  id: string,
  from: string,
  to: string,
  amount: number,
): Settlement {
  return {
    id,
    type: 'settlement',
    from,
    to,
    amount,
    date: '2026-05-11',
    createdAt: '2026-05-11T10:00:00.000Z',
    updatedAt: '2026-05-11T10:00:00.000Z',
  };
}

/** Replace the whole store with a known state for one test. */
export function seedStore(state: Partial<AppState>) {
  useGroupStore.setState({
    group: {
      id: 'g1',
      name: 'Test Trip',
      currency: 'INR',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    people: [],
    expenses: [],
    settlements: [],
    recurringExpenses: [],
    categories: DEFAULT_CATEGORIES,
    hydrated: true,
    ...state,
  });
}

export function renderWithRouter(ui: ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {ui}
    </MemoryRouter>,
  );
}

export { useGroupStore };
