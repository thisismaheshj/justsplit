import * as React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Button } from './button';

interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Renders -/+ stepper buttons either side of the field. */
  withSteppers?: boolean;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, withSteppers, className, ...props },
    ref,
  ) {
    const clamp = (n: number) => Math.min(max, Math.max(min, n));

    const field = (
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = event.target.value === '' ? min : Number(event.target.value);
          onChange(Number.isFinite(next) ? next : min);
        }}
        onBlur={(event) => {
          onChange(clamp(Number(event.target.value) || min));
          props.onBlur?.(event);
        }}
        className={cn(
          'h-11 w-full rounded-lg border border-input bg-card px-3 text-label text-foreground tabular',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          withSteppers && 'text-center',
          className,
        )}
        {...props}
      />
    );

    if (!withSteppers) return field;

    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Decrease"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus aria-hidden />
        </Button>
        {field}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Increase"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus aria-hidden />
        </Button>
      </div>
    );
  },
);
