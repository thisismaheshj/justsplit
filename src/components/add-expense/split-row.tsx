import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import type { Person } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

/** Shared layout for every per-person row inside a split editor. */
export function SplitRow({
  person,
  amount,
  currency,
  control,
  className,
}: {
  person: Person;
  amount?: number;
  currency: string;
  control?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5', className)}>
      <Avatar person={person} size="sm" />
      <span className="min-w-0 flex-1 truncate text-body font-medium">{person.name}</span>
      {control}
      {amount !== undefined && (
        <span className="shrink-0 text-body tabular text-muted-foreground">
          {formatCurrency(amount, currency)}
        </span>
      )}
    </div>
  );
}

export function SplitList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </div>
  );
}
