import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InstallAppButton } from '@/components/install/InstallAppButton';
import { listenForInstallPrompt, useInstallStore } from '@/lib/installPrompt';

function renderAt(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <InstallAppButton />
    </MemoryRouter>,
  );
}

/** A stand-in for Chrome's beforeinstallprompt event. */
function chromeOffersInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

function pretendToBeIphone() {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  );
}

describe('InstallAppButton', () => {
  beforeAll(() => listenForInstallPrompt());

  beforeEach(() => {
    useInstallStore.setState({ deferred: null, installed: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays hidden on a browser that cannot install', () => {
    renderAt();
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it("appears once Chrome offers installation, and opens Chrome's dialog", async () => {
    renderAt();
    const event = chromeOffersInstall();
    expect(event.defaultPrevented).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /install app/i }));
    });
    expect(event.prompt).toHaveBeenCalledOnce();
    // Accepted: the app is installed, so the button goes.
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('never shows inside the installed app', () => {
    useInstallStore.setState({ installed: true });
    renderAt();
    chromeOffersInstall();
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('hides when Chrome reports the app was installed', () => {
    renderAt();
    chromeOffersInstall();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('keeps off screens with their own bottom bar', () => {
    renderAt('/add-expense');
    chromeOffersInstall();
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('stays closed for 30 days once dismissed', () => {
    const { unmount } = renderAt();
    chromeOffersInstall();
    fireEvent.click(screen.getByRole('button', { name: /hide install button/i }));
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();

    unmount();
    renderAt();
    expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();
  });

  it('shows the Home Screen steps on an iPhone', async () => {
    pretendToBeIphone();
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: /install app/i }));
    expect(await screen.findByText(/add to home screen/i, { selector: 'strong' })).toBeInTheDocument();
  });
});
