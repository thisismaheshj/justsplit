import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { isIos, promptInstall, useInstallStore } from '@/lib/installPrompt';
import { withReloadOnStaleBuild } from '@/lib/staleBuild';

const IosInstallGuide = lazy(withReloadOnStaleBuild(() => import('./IosInstallGuide')));

const DISMISSED_KEY = 'justsplit-install-dismissed-at';
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Screens with their own bar pinned to the bottom (Save, Record payment,
 * the setup steps) would be covered by a floating button.
 */
const HIDDEN_ON = ['/add-expense', '/settle-up', '/setup', '/groups/new', '/auth/callback'];

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/**
 * Offers to put JustSplit on the home screen. Chrome and Edge get their own
 * install dialog; iPhone and iPad, which have none, get the Share-menu steps.
 * Never shown inside the installed app, on browsers that cannot install, or
 * for 30 days after being closed.
 */
export function InstallAppButton() {
  const deferred = useInstallStore((s) => s.deferred);
  const installed = useInstallStore((s) => s.installed);
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(dismissedRecently);
  const [guideOpen, setGuideOpen] = useState(false);
  const ios = isIos();

  const canInstall = Boolean(deferred) || ios;
  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // Safari cannot tell when the app has been added, so once someone has read
  // the steps the button steps aside as if closed.
  function onGuideChange(open: boolean) {
    setGuideOpen(open);
    if (!open) onDismiss();
  }

  // The button steps aside while the guide is up, rather than floating over it.
  if (guideOpen) return <Guide open onOpenChange={onGuideChange} />;
  if (installed || !canInstall || dismissed || hiddenHere) return null;

  async function onInstall() {
    if (deferred) await promptInstall();
    else setGuideOpen(true);
  }

  function onDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private browsing: it stays hidden for this visit only.
    }
    setDismissed(true);
  }

  return (
    <div className="fixed right-4 z-40 flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 pl-1 shadow-lg backdrop-blur-xl bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6">
      <button
        type="button"
        onClick={() => void onInstall()}
        className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-body font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-[120ms] hover:bg-primary-hover active:scale-[0.98]"
      >
        <Download className="size-4" aria-hidden />
        Install app
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide install button"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function Guide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Suspense fallback={null}>
      <IosInstallGuide open={open} onOpenChange={onOpenChange} />
    </Suspense>
  );
}
