import { describe, expect, it } from 'vitest';
import { expenseAccess, isSameExpense, MAX_EXPENSE_EDITS } from '@/lib/expenseAccess';
import { buildExpenseRecord } from '@/lib/groupsApi';
import type { ExpenseInput } from '@/types';

const input: ExpenseInput = {
  description: 'Dinner',
  amount: 90000,
  paidBy: 'm1',
  participants: [{ personId: 'm1' }, { personId: 'm2' }, { personId: 'm3' }],
  splitMethod: 'equal',
  category: 'food',
  date: '2026-11-09',
};

describe('who may change an expense', () => {
  const mine = { createdBy: 'me', editCount: 0 };

  it('lets the person who added it edit and delete it', () => {
    expect(expenseAccess(mine, 'me')).toEqual({ isCreator: true, canEdit: true, canDelete: true, editsLeft: 2 });
  });

  it('lets nobody else edit or delete it', () => {
    expect(expenseAccess(mine, 'someone-else')).toMatchObject({ isCreator: false, canEdit: false, canDelete: false });
  });

  it('allows two edits and no more, but deleting stays possible', () => {
    expect(expenseAccess({ createdBy: 'me', editCount: 1 }, 'me')).toMatchObject({ canEdit: true, editsLeft: 1 });
    expect(expenseAccess({ createdBy: 'me', editCount: MAX_EXPENSE_EDITS }, 'me')).toMatchObject({
      canEdit: false,
      canDelete: true,
      editsLeft: 0,
    });
  });

  it('treats an expense with no recorded adder, or a signed-out viewer, as not yours', () => {
    expect(expenseAccess({ createdBy: undefined, editCount: 0 }, 'me').canEdit).toBe(false);
    expect(expenseAccess(mine, undefined).canEdit).toBe(false);
  });
});

describe('edit counting', () => {
  it('records the adder on a new expense and starts at no edits', () => {
    const created = buildExpenseRecord(input, undefined, 'me');
    expect(created).toMatchObject({ createdBy: 'me', editCount: 0, editedAt: undefined });
  });

  it('counts an edit, stamps it, and keeps the original adder', () => {
    const created = buildExpenseRecord(input, undefined, 'me');
    const edited = buildExpenseRecord({ ...input, amount: 120000 }, created, 'someone-else');
    expect(edited.createdBy).toBe('me');
    expect(edited.editCount).toBe(1);
    expect(edited.editedAt).toBeDefined();
  });

  it('does not treat saving an unchanged expense as an edit', () => {
    const created = buildExpenseRecord(input, undefined, 'me');
    expect(isSameExpense(created, buildExpenseRecord(input, created))).toBe(true);
  });

  it('treats a change to the split alone as an edit', () => {
    const created = buildExpenseRecord(input, undefined, 'me');
    const fewerPeople = buildExpenseRecord(
      { ...input, participants: [{ personId: 'm1' }, { personId: 'm2' }] },
      created,
    );
    expect(isSameExpense(created, fewerPeople)).toBe(false);
  });
});
