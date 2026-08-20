import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useGroupStore } from '@/store/useGroupStore';

/**
 * Generates any due recurring expenses on mount, and again whenever the tab
 * regains focus (so an app left open across midnight still catches up).
 */
export function useRecurringCheck() {
  const hydrated = useGroupStore((s) => s.hydrated);
  const hasGroup = useGroupStore((s) => s.group !== null);
  const runDueRecurringCheck = useGroupStore((s) => s.runDueRecurringCheck);
  const lastRun = useRef<string>('');

  useEffect(() => {
    if (!hydrated || !hasGroup) return;

    const run = () => {
      // Only ever run once per calendar day per mount cycle.
      const today = new Date().toDateString();
      if (lastRun.current === today) return;
      lastRun.current = today;

      const created = runDueRecurringCheck();
      if (created > 0) {
        toast.success(
          created === 1 ? 'Added 1 recurring expense' : `Added ${created} recurring expenses`,
          { description: 'Generated from your repeating templates.' },
        );
      }
    };

    run();

    const onFocus = () => {
      // A focus event may cross a day boundary — allow a re-check.
      run();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hydrated, hasGroup, runDueRecurringCheck]);
}
