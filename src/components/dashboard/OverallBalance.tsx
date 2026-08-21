import { ArrowDownRight, ArrowUpRight, Check, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatAbsCurrency } from '@/lib/currency';
import type { CurrencyTotal } from '@/lib/dashboardApi';
import { cn } from '@/lib/utils';

/**
 * One total per currency, never a combined figure. Adding rupees to dollars
 * needs a rate, and inventing one turns a wrong number into a confident one.
 */
export function OverallBalance({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {totals.map((total) => {
          const settled = total.net === 0;
          const positive = total.net > 0;
          const Icon = settled ? Check : positive ? ArrowUpRight : ArrowDownRight;

          return (
            <Card key={total.currency} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                  {settled ? 'All settled' : positive ? 'You are owed' : 'You owe'}
                </span>
                <span className="text-caption font-medium text-muted-foreground">
                  {total.currency}
                </span>
              </div>

              <p
                className={cn(
                  'mt-2 flex items-center gap-1.5 text-page font-semibold tabular',
                  settled && 'text-muted-foreground',
                  !settled && positive && 'text-positive',
                  !settled && !positive && 'text-negative',
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {settled ? '' : positive ? '+' : '-'}
                {formatAbsCurrency(total.net, total.currency)}
              </p>

              <p className="mt-1 text-caption text-muted-foreground">
                Across {total.groupCount} {total.groupCount === 1 ? 'group' : 'groups'}
                {total.owedToYou > 0 && total.youOwe > 0 && (
                  <>
                    {' '}· {formatAbsCurrency(total.owedToYou, total.currency)} in,{' '}
                    {formatAbsCurrency(total.youOwe, total.currency)} out
                  </>
                )}
              </p>
            </Card>
          );
        })}
      </div>

      {totals.length > 1 && (
        <p className="flex items-start gap-2 text-caption text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Kept separate by currency — JustSplit never converts between them, so nothing here
          depends on an exchange rate.
        </p>
      )}
    </section>
  );
}
