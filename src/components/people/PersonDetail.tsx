import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Pencil, Receipt, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { BalanceAmount } from '@/components/ui/balance-amount';
import { SectionHeader } from '@/components/ui/section-header';
import { ExpenseListItem } from '@/components/expenses/ExpenseListItem';
import { PersonFormDialog } from './PersonFormDialog';

import { useGroupStore } from '@/store/useGroupStore';
import { useBalances } from '@/hooks/usePersonBalance';
import {
  describePersonOverall,
  selectActivePeople,
  selectPersonPaidTotal,
  selectPersonShareTotal,
  selectTransactionsForPerson,
} from '@/store/selectors';
import { formatCurrency } from '@/lib/currency';
import type { Person } from '@/types';

export function PersonDetail({ person }: { person: Person }) {
  const navigate = useNavigate();
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';
  const balances = useBalances();
  const balance = balances[person.id] ?? 0;

  const [editOpen, setEditOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const history = selectTransactionsForPerson(store, person.id);
  const paid = selectPersonPaidTotal(store, person.id);
  const share = selectPersonShareTotal(store, person.id);
  const isLastActivePerson = selectActivePeople(store).length <= 1 && !person.archived;
  const hasHistory = history.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Avatar person={person} size="xl" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-page font-semibold">{person.name}</h2>
            {person.archived && (
              <Badge variant="outline">
                <Archive aria-hidden />
                Removed
              </Badge>
            )}
          </div>
          <p className="mt-1 text-body text-muted-foreground">
            {describePersonOverall(person.name, balance, currency)}
          </p>
          <div className="mt-2">
            <BalanceAmount balance={balance} currency={currency} size="lg" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil aria-hidden />
            Edit
          </Button>
          {!person.archived && (
            <Button
              variant="secondary"
              size="sm"
              className="text-negative"
              disabled={isLastActivePerson}
              title={isLastActivePerson ? 'A group needs at least one person' : undefined}
              onClick={() => setConfirmRemove(true)}
            >
              <UserMinus aria-hidden />
              Remove
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Paid for the group
          </p>
          <p className="mt-1 text-section font-semibold tabular">{formatCurrency(paid, currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Their share of expenses
          </p>
          <p className="mt-1 text-section font-semibold tabular">
            {formatCurrency(share, currency)}
          </p>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Their activity"
          description={`${history.length} ${history.length === 1 ? 'entry' : 'entries'} involving ${person.name}`}
        />

        {hasHistory ? (
          <Card className="divide-y divide-border overflow-hidden">
            {history.map((transaction) => (
              <ExpenseListItem
                key={transaction.id}
                transaction={transaction}
                people={store.people}
                categories={store.categories}
                currency={currency}
                showDate
              />
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={<Receipt />}
            title="Nothing recorded yet"
            description={`${person.name} is not part of any expense or settlement so far.`}
            action={
              <Button asChild>
                <Link to="/add-expense">Add an expense</Link>
              </Button>
            }
          />
        )}
      </section>

      <PersonFormDialog open={editOpen} onOpenChange={setEditOpen} person={person} />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${person.name}?`}
        destructive
        confirmLabel={hasHistory ? 'Remove from group' : 'Delete'}
        description={
          hasHistory ? (
            <span className="flex flex-col gap-2">
              <span>
                {person.name} has {history.length}{' '}
                {history.length === 1 ? 'entry' : 'entries'} in this group
                {balance !== 0 && (
                  <>
                    {' '}
                    and a balance of{' '}
                    <strong>{formatCurrency(Math.abs(balance), currency)}</strong>
                  </>
                )}
                .
              </span>
              <span>
                They will stop appearing when you add new expenses, but their existing expenses and
                settlements stay exactly as they are, so past balances remain correct.
              </span>
            </span>
          ) : (
            <span>
              {person.name} has no expenses or settlements yet, so they will be deleted entirely.
              This can't be undone.
            </span>
          )
        }
        onConfirm={() => {
          store.removePerson(person.id);
          toast.success(
            hasHistory ? `${person.name} removed from new expenses` : `${person.name} deleted`,
          );
          navigate('/people', { replace: true });
        }}
      />
    </div>
  );
}
