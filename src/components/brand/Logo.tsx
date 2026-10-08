import { cn } from '@/lib/utils';

/**
 * The JustSplit mark: one coin, split down the middle. Drawn inline so it is
 * crisp at any size and themes with the accent token.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[55%]" fill="none">
        <path d="M11 3.05A9 9 0 0 0 11 20.95Z" fill="currentColor" />
        <path d="M13 3.05a9 9 0 0 1 0 17.9Z" fill="currentColor" fillOpacity="0.45" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8 rounded-lg" />
      <span className="text-section font-semibold tracking-tight">JustSplit</span>
    </span>
  );
}
