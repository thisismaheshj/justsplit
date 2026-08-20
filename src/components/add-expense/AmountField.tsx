import * as React from 'react';
import { cn } from '@/lib/utils';
import { currencySymbol, decimalDigits } from '@/lib/currency';

interface AmountFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'> {
  id: string;
  value: string;
  onChange: (value: string) => void;
  currency: string;
  error?: string;
}

/** Keeps only digits and a single decimal separator, capped to the currency's precision. */
export function sanitizeAmountInput(raw: string, currency: string): string {
  const digits = decimalDigits(currency);
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  if (digits === 0) return cleaned.split('.')[0];
  const [whole, fraction] = cleaned.split('.');
  if (fraction === undefined) return whole;
  return `${whole}.${fraction.slice(0, digits)}`;
}

/** The hero amount input at the top of the Add Expense screen. */
export const AmountField = React.forwardRef<HTMLInputElement, AmountFieldProps>(
  function AmountField({ id, value, onChange, currency, error, ...rest }, ref) {
    return (
      <div
        className={cn(
          'rounded-2xl border bg-card p-5 shadow-sm transition-colors',
          error ? 'border-negative' : 'border-border',
        )}
      >
        <label htmlFor={id} className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
          Amount
        </label>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-page font-semibold text-muted-foreground" aria-hidden>
            {currencySymbol(currency)}
          </span>
          <input
            ref={ref}
            id={id}
            inputMode="decimal"
            autoComplete="off"
            placeholder={decimalDigits(currency) === 0 ? '0' : '0.00'}
            value={value}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(sanitizeAmountInput(event.target.value, currency))}
            className="w-full min-w-0 border-0 bg-transparent p-0 text-[2rem] font-semibold leading-tight tabular text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
            {...rest}
          />
        </div>
      </div>
    );
  },
);
