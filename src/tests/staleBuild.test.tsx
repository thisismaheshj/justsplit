import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { isStaleBuildError, withReloadOnStaleBuild } from '@/lib/staleBuild';
import { ScreenErrorBoundary } from '@/components/layout/ScreenErrorBoundary';

const staleError = new TypeError(
  'Failed to fetch dynamically imported module: https://thisismaheshj.github.io/justsplit/assets/ExpensesPage-OLD.js',
);

describe('opening a screen from an older build', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recognises the errors browsers give for a missing screen file', () => {
    expect(isStaleBuildError(staleError)).toBe(true);
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads onto the new build instead of failing', async () => {
    const load = withReloadOnStaleBuild(() => Promise.reject(staleError));
    let settled = false;
    void load().then(
      () => (settled = true),
      () => (settled = true),
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(reload).toHaveBeenCalledOnce();
    // Left pending so nothing flashes an error while the page reloads.
    expect(settled).toBe(false);
  });

  it('does not reload in a loop when the file is still missing afterwards', async () => {
    const load = withReloadOnStaleBuild(() => Promise.reject(staleError));
    void load();
    await new Promise((r) => setTimeout(r, 10));
    await expect(load()).rejects.toBe(staleError);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('leaves other errors alone', async () => {
    const bug = new Error('something else broke');
    await expect(withReloadOnStaleBuild(() => Promise.reject(bug))()).rejects.toBe(bug);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('ScreenErrorBoundary', () => {
  it('shows a way out instead of a blank page when a screen throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): never {
      throw new Error('boom');
    }
    render(
      <ScreenErrorBoundary>
        <Broken />
      </ScreenErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
