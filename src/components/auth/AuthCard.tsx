import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  /** 1-based position in the sign-up flow, shown as progress dots. */
  step?: { current: number; total: number };
}

/**
 * Shared shell for every unauthenticated and onboarding screen. On a phone the
 * form sits directly on the page, with no card border boxing it in; from `sm`
 * up it floats in a card.
 */
export function AuthCard({ title, subtitle, error, children, footer, step }: AuthCardProps) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center bg-background px-5 pb-10 pt-[max(3rem,env(safe-area-inset-top))] sm:justify-center sm:py-12"
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="mb-6 size-11" />
          {step && (
            <div className="mb-4 flex gap-1.5" role="img" aria-label={`Step ${step.current} of ${step.total}`}>
              {Array.from({ length: step.total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    i + 1 === step.current ? 'w-6 bg-primary' : i + 1 < step.current ? 'w-3 bg-primary/40' : 'w-3 bg-border-strong',
                  )}
                />
              ))}
            </div>
          )}
          <h1 className="text-page font-semibold text-foreground">{title}</h1>
          <p className="mt-1.5 text-body text-muted-foreground">{subtitle}</p>
        </div>

        <div className="sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-7 sm:shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg border border-negative/30 bg-negative-soft p-3 text-body text-negative"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
          {children}
        </div>

        {footer && <div className="mt-8 text-center text-body text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
