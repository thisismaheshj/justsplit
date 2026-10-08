import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/card';

interface SummaryCardsProps {
  totalSpend: number;
  outstanding: number;
  expenseCount: number;
  currency: string;
}

/**
 * Group-level numbers: what was spent in total, and how much is still moving
 * between people. One hero figure and two small ones, so on a phone the
 * balances are still above the fold.
 */
export function SummaryCards({
  totalSpend,
  outstanding,
  expenseCount,
  currency,
}: SummaryCardsProps) {
  const average = expenseCount ? Math.round(totalSpend / expenseCount) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="col-span-2 flex flex-col justify-between gap-3 border-0 bg-primary p-5 text-primary-foreground">
        <p className="text-caption font-medium uppercase tracking-wide opacity-80">Total group spend</p>
        <div>
          <p className="text-[2rem] font-semibold leading-none tabular">{formatCurrency(totalSpend, currency)}</p>
          <p className="mt-2 text-caption opacity-80">
            {expenseCount} expense{expenseCount === 1 ? '' : 's'} recorded
          </p>
        </div>
      </Card>

      <Stat
        label="To settle"
        value={formatCurrency(outstanding, currency)}
        detail={outstanding === 0 ? 'Everyone is square' : 'Open balances'}
      />
      <Stat label="Average" value={formatCurrency(average, currency)} detail="Per expense" />
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="flex min-w-0 flex-col justify-between gap-3 p-4">
      <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="min-w-0">
        <p className="truncate text-section font-semibold tabular">{value}</p>
        <p className="mt-0.5 text-caption text-muted-foreground">{detail}</p>
      </div>
    </Card>
  );
}
