import { Link } from 'react-router-dom';
import { ArrowRight, HandCoins } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { formatRelativeDay } from '@/lib/date';
import { findCategory } from '@/lib/categories';
import type { Category, Person, Transaction } from '@/types';

interface ExpenseListItemProps {
  transaction: Transaction;
  people: Person[];
  categories: Category[];
  currency: string;
  /** Show the relative date on the row (used on Home, not in grouped history). */
  showDate?: boolean;
}

/**
 * One row in any transaction feed. Settlements are visually distinct from
 * expenses via their icon, badge and phrasing — never colour alone.
 */
export function ExpenseListItem({
  transaction,
  people,
  categories,
  currency,
  showDate = false,
}: ExpenseListItemProps) {
  const byId = (id: string) => people.find((p) => p.id === id);

  if (transaction.type === 'settlement') {
    const from = byId(transaction.from);
    const to = byId(transaction.to);

    return (
      <Link
        to={`/settle-up?edit=${transaction.id}`}
        className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-positive-soft text-positive"
          aria-hidden
        >
          <HandCoins className="size-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-label font-medium">
              {from?.name ?? 'Someone'} paid {to?.name ?? 'someone'}
            </span>
            <Badge variant="positive">Settlement</Badge>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-caption text-muted-foreground">
            {from && <Avatar person={from} size="xs" />}
            <ArrowRight className="size-3" aria-hidden />
            {to && <Avatar person={to} size="xs" />}
            {showDate && <span>· {formatRelativeDay(transaction.date)}</span>}
            {transaction.note && <span className="truncate">· {transaction.note}</span>}
          </span>
        </span>

        <span className="shrink-0 text-label font-semibold tabular">
          {formatCurrency(transaction.amount, currency)}
        </span>
      </Link>
    );
  }

  const category = findCategory(categories, transaction.category);
  const payer = byId(transaction.paidBy);
  const participants = transaction.participants
    .map((p) => byId(p.personId))
    .filter((p): p is Person => Boolean(p));

  return (
    <Link
      to={`/expenses/${transaction.id}`}
      className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
    >
      <CategoryIcon icon={category.icon} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-medium">{transaction.description}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-muted-foreground">
          <span className="truncate">{payer?.name ?? 'Someone'} paid</span>
          <span aria-hidden>·</span>
          <AvatarStack people={participants} />
          <span>
            {participants.length} {participants.length === 1 ? 'person' : 'people'}
          </span>
          {showDate && (
            <>
              <span aria-hidden>·</span>
              <span>{formatRelativeDay(transaction.date)}</span>
            </>
          )}
        </span>
      </span>

      <span className="shrink-0 text-label font-semibold tabular">
        {formatCurrency(transaction.amount, currency)}
      </span>
    </Link>
  );
}
