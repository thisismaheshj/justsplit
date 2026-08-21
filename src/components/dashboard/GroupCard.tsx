import { Link } from 'react-router-dom';
import { ArrowRight, Receipt, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { BalanceAmount } from '@/components/ui/balance-amount';
import { formatCurrency } from '@/lib/currency';
import { formatRelativeDay } from '@/lib/date';
import type { DashboardGroup } from '@/lib/dashboardApi';

export function GroupCard({
  group,
  onOpen,
}: {
  group: DashboardGroup;
  onOpen: (groupId: string) => void;
}) {
  const phrase =
    group.myBalance === 0
      ? 'settled up'
      : group.myBalance > 0
        ? 'you are owed'
        : 'you owe';

  return (
    <Card className="transition-colors hover:bg-muted">
      <Link
        to="/home"
        onClick={(event) => {
          // Opening a card switches the active group first; the ledger has to
          // be loaded before /home can render anything meaningful.
          event.preventDefault();
          onOpen(group.groupId);
        }}
        className="flex h-full flex-col gap-3 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-label font-semibold">{group.name}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                {group.memberCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <Receipt className="size-3.5" aria-hidden />
                {group.expenseCount}
              </span>
              <span>{group.currency}</span>
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption text-muted-foreground">{phrase}</p>
            <BalanceAmount balance={group.myBalance} currency={group.currency} />
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-foreground">
              {group.lastActivity ? formatRelativeDay(group.lastActivity) : 'No activity yet'}
            </p>
            <p className="text-caption tabular text-muted-foreground">
              {formatCurrency(group.totalSpend, group.currency)} total
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
