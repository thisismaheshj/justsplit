import { create } from 'zustand';

/**
 * Chrome's install offer. Not in TypeScript's DOM types because only
 * Chromium browsers (Chrome, Edge, Samsung Internet) implement it.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  /** Held until the user taps Install; Chrome only lets it be used once. */
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export const useInstallStore = create<InstallState>(() => ({
  deferred: null,
  installed: isStandalone(),
}));

/** True inside the app opened from the home screen or dock, in any browser. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    // iOS Safari's own flag, from before it supported display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iPhone and iPad, in any browser: all of them can add to the home screen
 * from the Share menu, and none of them fire beforeinstallprompt. iPadOS
 * reports itself as a Mac, so a touch screen gives it away.
 */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Chrome fires beforeinstallprompt once, often before React has rendered
 * anything, so the listener is registered from main.tsx at startup rather
 * than inside the button.
 */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep Chrome's own mini-infobar away; our button offers it instead.
    event.preventDefault();
    useInstallStore.setState({ deferred: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => {
    useInstallStore.setState({ deferred: null, installed: true });
  });
}

/** Shows Chrome's install dialog. True if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const { deferred } = useInstallStore.getState();
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  useInstallStore.setState({ deferred: null, installed: outcome === 'accepted' });
  return outcome === 'accepted';
}
