import { ArrowLeftRight, Receipt, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';

interface SummaryCardsProps {
  totalSpend: number;
  outstanding: number;
  expenseCount: number;
  currency: string;
}

/**
 * There is no signed-in "you", so the summary is group-level: what was spent
 * in total, and how much is still moving between people.
 */
export function SummaryCards({
  totalSpend,
  outstanding,
  expenseCount,
  currency,
}: SummaryCardsProps) {
  const items = [
    {
      icon: Wallet,
      label: 'Total group spend',
      value: formatCurrency(totalSpend, currency),
      detail: `${expenseCount} expense${expenseCount === 1 ? '' : 's'} recorded`,
    },
    {
      icon: ArrowLeftRight,
      label: 'Still to settle',
      value: formatCurrency(outstanding, currency),
      detail: outstanding === 0 ? 'Everyone is square' : 'Across all open balances',
    },
    {
      icon: Receipt,
      label: 'Average per expense',
      value: formatCurrency(expenseCount ? Math.round(totalSpend / expenseCount) : 0, currency),
      detail: 'All-time average',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <item.icon className="size-4" aria-hidden />
            <span className="text-caption font-medium uppercase tracking-wide">{item.label}</span>
          </div>
          <p className="mt-2 text-page font-semibold tabular">{item.value}</p>
          <p className="mt-0.5 text-caption text-muted-foreground">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}
