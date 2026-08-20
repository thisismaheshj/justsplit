import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMediumDate } from '@/lib/date';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Wraps the native date input — it is keyboard accessible, localised by the
 * platform, and gives mobile users the OS date wheel for free.
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { value, onChange, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <Calendar
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-label text-foreground',
          '[&::-webkit-calendar-picker-indicator]:opacity-60',
          className,
        )}
        {...props}
      />
    </div>
  );
});

export function DateDisplay({ value }: { value: string }) {
  return <span>{formatMediumDate(value)}</span>;
}
