import { ArrowDownRight, ArrowUpRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAbsCurrency, formatCurrency } from '@/lib/currency';

/**
 * Balance direction is never conveyed by colour alone: every rendering pairs
 * the tone with a +/- sign, a directional icon, and explicit wording.
 */
export function BalanceAmount({
  balance,
  currency,
  size = 'md',
  className,
}: {
  balance: number;
  currency: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const text = size === 'lg' ? 'text-page' : size === 'sm' ? 'text-body' : 'text-label';
  const icon = size === 'lg' ? 'size-5' : 'size-4';

  if (balance === 0) {
    return (
      <span className={cn('inline-flex items-center gap-1 font-semibold text-muted-foreground', text, className)}>
        <Check className={icon} aria-hidden />
        {formatCurrency(0, currency)}
      </span>
    );
  }

  const positive = balance > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular',
        positive ? 'text-positive' : 'text-negative',
        text,
        className,
      )}
    >
      <Icon className={icon} aria-hidden />
      <span>
        {positive ? '+' : '-'}
        {formatAbsCurrency(balance, currency)}
      </span>
    </span>
  );
}

/**
 * "gets back ₹1,500" / "owes ₹300" / "settled up".
 * Narrow screens drop the repeated figure — the row's own BalanceAmount is
 * right beside it — so the phrase never wraps or collides with it.
 */
export function BalancePhrase({
  balance,
  currency,
  className,
}: {
  balance: number;
  currency: string;
  className?: string;
}) {
  if (balance === 0) {
    return (
      <span className={cn('block truncate text-body text-muted-foreground', className)}>
        settled up
      </span>
    );
  }
  return (
    <span
      className={cn(
        'block truncate text-body',
        balance > 0 ? 'text-positive' : 'text-negative',
        className,
      )}
    >
      {balance > 0 ? 'gets back' : 'owes'}
      <span className="hidden font-medium tabular sm:inline">
        {' '}
        {formatAbsCurrency(balance, currency)}
      </span>
    </span>
  );
}
