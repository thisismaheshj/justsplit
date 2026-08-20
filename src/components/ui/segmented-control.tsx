import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
  id?: string;
}

/**
 * Roving-tabindex segmented control. Arrow keys move between options, matching
 * the WAI-ARIA radiogroup pattern.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  id,
}: SegmentedControlProps<T>) {
  const move = (delta: number) => {
    const index = options.findIndex((o) => o.value === value);
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label}
      className={cn('grid grid-flow-col rounded-lg bg-muted p-1', className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative min-h-11 rounded-md px-3 py-2 text-body font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id ?? label}`}
                className="absolute inset-0 rounded-md bg-card shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
