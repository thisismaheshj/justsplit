import { useEffect, useState, type ReactNode } from 'react';
import { useGroupStore } from '@/store/useGroupStore';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Holds the router back until the persisted state has been read, so the
 * /setup guard never redirects a returning user on the first frame.
 */
export function HydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useGroupStore((s) => s.hydrated);
  const setHydrated = useGroupStore((s) => s.setHydrated);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    // Safety net: if storage is blocked (private mode, disabled cookies) the
    // rehydrate callback may never fire — carry on with empty state.
    const timer = window.setTimeout(() => {
      setHydrated(true);
      setTimedOut(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [hydrated, setHydrated]);

  if (!hydrated && !timedOut) return <BootSkeleton />;
  return <>{children}</>;
}

export function BootSkeleton() {
  return (
    <div className="min-h-dvh bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your group…</span>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4 md:p-8">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
