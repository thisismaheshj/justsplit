import { AlertCircle } from 'lucide-react';

/**
 * Shown instead of the auth screens when the env vars are missing, so a fresh
 * clone explains itself rather than failing silently on every button press.
 */
export function SupabaseNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-[460px] rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <AlertCircle className="size-4 text-negative" aria-hidden />
          <h1 className="text-section font-semibold">Supabase is not configured</h1>
        </div>
        <p className="text-body text-muted-foreground">
          Create a <code className="rounded bg-muted px-1 py-0.5">.env.local</code> in the project
          root with your project&rsquo;s URL and anon key, then restart the dev server:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted p-3 text-caption text-foreground">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
        </pre>
        <p className="mt-3 text-caption text-muted-foreground">
          Both values are in your Supabase dashboard under Project Settings → API. See
          {' '}<code className="rounded bg-muted px-1 py-0.5">SUPABASE_SETUP.md</code>.
        </p>
      </div>
    </main>
  );
}
