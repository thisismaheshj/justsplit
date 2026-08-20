import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Repeat, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionHeader } from '@/components/ui/section-header';

import { useGroupStore } from '@/store/useGroupStore';
import { findCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/currency';
import { formatLongDate } from '@/lib/date';
import type { Expense } from '@/types';

const METHOD_LABEL: Record<string, string> = {
  equal: 'Split equally',
  exact: 'Exact amounts',
  percentage: 'By percentage',
  shares: 'By shares',
};

export function ExpenseDetail({ expense }: { expense: Expense }) {
  const navigate = useNavigate();
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';
  const [confirmDelete, setConfirmDelete] = useState(false);

  const category = findCategory(store.categories, expense.category);
  const payer = store.people.find((p) => p.id === expense.paidBy);
  const template = store.recurringExpenses.find((r) => r.id === expense.recurringExpenseId);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <CategoryIcon icon={category.icon} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-section font-semibold">{expense.description}</h2>
            <p className="mt-0.5 text-body text-muted-foreground">
              {formatLongDate(expense.date)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="neutral">{category.label}</Badge>
              <Badge variant="outline">{METHOD_LABEL[expense.splitMethod]}</Badge>
              {expense.recurringExpenseId && (
                <Badge variant="primary">
                  <Repeat aria-hidden />
                  Recurring
                </Badge>
              )}
            </div>
          </div>
          <p className="shrink-0 text-page font-semibold tabular">
            {formatCurrency(expense.amount, currency)}
          </p>
        </div>

        {payer && (
          <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
            <Avatar person={payer} size="sm" />
            <p className="text-body">
              <span className="font-medium">{payer.name}</span> paid{' '}
              <span className="font-medium tabular">
                {formatCurrency(expense.amount, currency)}
              </span>
            </p>
          </div>
        )}

        {expense.note && (
          <p className="mt-4 flex gap-2 rounded-xl bg-muted p-3 text-body text-muted-foreground">
            <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden />
            {expense.note}
          </p>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Split between"
          description={`${expense.participants.length} ${expense.participants.length === 1 ? 'person' : 'people'}`}
        />
        <Card className="divide-y divide-border overflow-hidden">
          {expense.participants.map((share) => {
            const person = store.people.find((p) => p.id === share.personId);
            if (!person) return null;
            return (
              <div key={share.personId} className="flex items-center gap-3 px-4 py-3">
                <Avatar person={person} size="sm" />
                <span className="min-w-0 flex-1 truncate text-body font-medium">
                  {person.name}
                  {person.archived && (
                    <span className="ml-1.5 text-caption font-normal text-muted-foreground">
                      (removed)
                    </span>
                  )}
                </span>
                {expense.splitMethod === 'percentage' && share.inputValue !== undefined && (
                  <span className="text-caption tabular text-muted-foreground">
                    {share.inputValue}%
                  </span>
                )}
                {expense.splitMethod === 'shares' && share.inputValue !== undefined && (
                  <span className="text-caption tabular text-muted-foreground">
                    {share.inputValue} {share.inputValue === 1 ? 'share' : 'shares'}
                  </span>
                )}
                <span className="shrink-0 text-body font-medium tabular">
                  {formatCurrency(share.amountOwed, currency)}
                </span>
              </div>
            );
          })}
        </Card>
      </section>

      {template && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-body text-muted-foreground">
            Generated from the repeating template “{template.description}”.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link to="/recurring">Manage recurring</Link>
          </Button>
        </Card>
      )}

      <div className="flex gap-2">
        <Button asChild className="flex-1 sm:flex-none sm:px-8">
          <Link to={`/add-expense/${expense.id}`}>
            <Pencil aria-hidden />
            Edit expense
          </Link>
        </Button>
        <Button
          variant="secondary"
          className="text-negative"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this expense?"
        description={`"${expense.description}" will be removed and everyone's balance will update. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          store.deleteExpense(expense.id);
          toast.success('Expense deleted');
          navigate('/expenses', { replace: true });
        }}
      />
    </div>
  );
}
