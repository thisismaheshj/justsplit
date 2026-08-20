import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6"
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-section font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-body text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
