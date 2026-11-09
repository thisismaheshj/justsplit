import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface State {
  failed: boolean;
}

/**
 * Without this, any screen that throws while loading or rendering takes the
 * whole app down to a blank page with no way forward but closing it. This
 * keeps the failure to a message and a button that does the one useful thing.
 */
export class ScreenErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen failed to load:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        id="main"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center"
      >
        <h1 className="font-display text-page">Something went wrong</h1>
        <p className="max-w-sm text-body text-muted-foreground">
          This screen didn't load. Your expenses are safe; reloading usually fixes it.
        </p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    );
  }
}
