/**
 * Every screen behind sign-in is its own file, named after a hash of its
 * contents, and each deploy deletes the previous set. A tab or home-screen app
 * opened before a deploy still asks for the old names, gets "not found", and
 * the screen it was opening fails to load. The fix is the page the user would
 * reach for anyway: reload, once, to pick up the new version.
 */

const RELOADED_AT = 'justsplit-stale-reload-at';
// A second failure this soon after reloading is a real fault, not an old
// build: let it surface instead of reloading in a loop.
const LOOP_GUARD_MS = 30_000;

export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(
    message,
  );
}

/** Reloads to fetch the current build. False if it just did, so the caller should give up. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT));
    if (Number.isFinite(last) && Date.now() - last < LOOP_GUARD_MS) return false;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  } catch {
    // No session storage (some private modes): reload anyway, once per page.
  }
  window.location.reload();
  return true;
}

/**
 * Wraps a screen's import. On a stale-build failure the page reloads, and the
 * returned promise never settles, so nothing flashes an error on the way out.
 */
export function withReloadOnStaleBuild<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((error: unknown) => {
      if (isStaleBuildError(error) && reloadForNewBuild()) return new Promise<T>(() => {});
      throw error;
    });
}

/** Vite's own signal that a file it was preloading for a screen is gone. */
export function listenForStaleBuild() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
}
