import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AddExpenseForm } from '@/components/add-expense/AddExpenseForm';
import { SettleUpForm } from '@/components/settle-up/SettleUpForm';
import { PersonDetail } from '@/components/people/PersonDetail';

import {
  makeExpense,
  makePerson,
  renderWithRouter,
  seedStore,
  useGroupStore,
} from './test-utils';

const mahesh = makePerson('p-mahesh', 'Mahesh');
const rahul = makePerson('p-rahul', 'Rahul');
const amit = makePerson('p-amit', 'Amit');

beforeEach(() => {
  seedStore({ people: [mahesh, rahul, amit] });
});

describe('AddExpenseForm', () => {
  it('keeps Save disabled until the required fields are filled in', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddExpenseForm />);

    const save = screen.getByRole('button', { name: /save expense/i });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/amount/i), '900');
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/description/i), 'Dinner');
    expect(save).toBeEnabled();
  });

  it('blocks submit while an exact split does not add up, and enables it once it does', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddExpenseForm />);

    await user.type(screen.getByLabelText(/amount/i), '900');
    await user.type(screen.getByLabelText(/description/i), 'Dinner');
    await user.click(screen.getByRole('radio', { name: 'Exact' }));

    const save = screen.getByRole('button', { name: /save expense/i });
    expect(save).toBeDisabled();
    expect(screen.getByText(/left to assign/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Amount for Mahesh'), '300');
    await user.type(screen.getByLabelText('Amount for Rahul'), '300');
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('Amount for Amit'), '300');

    await waitFor(() => expect(save).toBeEnabled());
    expect(screen.getByText(/split adds up/i)).toBeInTheDocument();
  });

  it('flags an exact split that overshoots the total', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddExpenseForm />);

    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/description/i), 'Chai');
    await user.click(screen.getByRole('radio', { name: 'Exact' }));
    await user.type(screen.getByLabelText('Amount for Mahesh'), '200');

    expect(screen.getByRole('button', { name: /save expense/i })).toBeDisabled();
    expect(screen.getByText(/over$/i)).toBeInTheDocument();
  });

  it('saves an equal split with the correct per-person amounts', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddExpenseForm />);

    await user.type(screen.getByLabelText(/amount/i), '1000');
    await user.type(screen.getByLabelText(/description/i), 'Groceries');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(useGroupStore.getState().expenses).toHaveLength(1));

    const [expense] = useGroupStore.getState().expenses;
    expect(expense.description).toBe('Groceries');
    expect(expense.amount).toBe(100_000);
    // 100000 / 3 leaves a remainder of 1, given to the first participant.
    expect(expense.participants.map((p) => p.amountOwed)).toEqual([33_334, 33_333, 33_333]);
    expect(
      expense.participants.reduce((sum, p) => sum + p.amountOwed, 0),
    ).toBe(expense.amount);
  });

  it('excludes someone from the split when they are unchecked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddExpenseForm />);

    await user.type(screen.getByLabelText(/amount/i), '600');
    await user.type(screen.getByLabelText(/description/i), 'Taxi');
    await user.click(screen.getByRole('checkbox', { name: /amit/i }));
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(useGroupStore.getState().expenses).toHaveLength(1));
    const [expense] = useGroupStore.getState().expenses;
    expect(expense.participants.map((p) => p.personId)).toEqual(['p-mahesh', 'p-rahul']);
    expect(expense.participants.map((p) => p.amountOwed)).toEqual([30_000, 30_000]);
  });
});

describe('SettleUpForm', () => {
  it('pre-fills From, To and Amount when a suggested settlement is tapped', async () => {
    const user = userEvent.setup();
    // Mahesh paid 900 for all three, so Rahul and Amit each owe him 300.
    seedStore({
      people: [mahesh, rahul, amit],
      expenses: [makeExpense('e1', 90_000, 'p-mahesh', ['p-mahesh', 'p-rahul', 'p-amit'])],
    });

    renderWithRouter(<SettleUpForm />, { route: '/settle-up' });

    const suggestion = screen.getByRole('button', { name: /Rahul pays Mahesh/i });
    await user.click(suggestion);

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('300.00'));

    const whoPaid = screen.getByRole('radiogroup', { name: /who paid/i });
    expect(within(whoPaid).getByRole('radio', { name: /rahul/i })).toBeChecked();

    const whoReceived = screen.getByRole('radiogroup', { name: /who received it/i });
    expect(within(whoReceived).getByRole('radio', { name: /mahesh/i })).toBeChecked();

    // Two taps total: the suggestion, then Save.
    await user.click(screen.getByRole('button', { name: /record settlement/i }));
    await waitFor(() => expect(useGroupStore.getState().settlements).toHaveLength(1));

    const [settlement] = useGroupStore.getState().settlements;
    expect(settlement).toMatchObject({ from: 'p-rahul', to: 'p-mahesh', amount: 30_000 });
  });

  it('shows the settled empty state when nobody owes anything', () => {
    seedStore({ people: [mahesh, rahul] });
    renderWithRouter(<SettleUpForm />, { route: '/settle-up' });
    expect(screen.getByText(/everyone is settled/i)).toBeInTheDocument();
  });
});

describe('PersonDetail removal', () => {
  it('explains that history is kept when removing someone with expenses', async () => {
    const user = userEvent.setup();
    seedStore({
      people: [mahesh, rahul, amit],
      expenses: [makeExpense('e1', 90_000, 'p-mahesh', ['p-mahesh', 'p-rahul', 'p-amit'])],
    });

    renderWithRouter(<PersonDetail person={rahul} />, { route: '/people/p-rahul' });
    await user.click(screen.getByRole('button', { name: /remove/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/remove rahul\?/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/existing expenses and settlements stay exactly as they are/i),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /remove from group/i }));

    await waitFor(() => {
      const stored = useGroupStore.getState().people.find((p) => p.id === 'p-rahul');
      expect(stored?.archived).toBe(true);
    });
    // The expense is untouched, so historical balances stay correct.
    expect(useGroupStore.getState().expenses).toHaveLength(1);
  });

  it('deletes outright when the person has no history', async () => {
    const user = userEvent.setup();
    seedStore({ people: [mahesh, rahul, amit] });

    renderWithRouter(<PersonDetail person={amit} />, { route: '/people/p-amit' });
    await user.click(screen.getByRole('button', { name: /remove/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/no expenses or settlements yet/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));
    await waitFor(() =>
      expect(useGroupStore.getState().people.some((p) => p.id === 'p-amit')).toBe(false),
    );
  });

  it('will not let the last remaining person be removed', () => {
    seedStore({ people: [mahesh] });
    renderWithRouter(<PersonDetail person={mahesh} />, { route: '/people/p-mahesh' });
    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
  });
});
