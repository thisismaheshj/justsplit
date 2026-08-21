import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared shell for every unauthenticated screen. */
export function AuthCard({ title, subtitle, error, children, footer }: AuthCardProps) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10"
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <div className="mb-3 text-2xl" aria-hidden>
            🧾
          </div>
          <h1 className="text-page font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-body text-muted-foreground">{subtitle}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-negative/30 bg-negative-soft p-3 text-body text-negative"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-body text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
