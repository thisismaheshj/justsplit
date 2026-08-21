import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Where Google sends the user back to. The Supabase client is created with
 * detectSessionInUrl, so it has already swapped the code for a session by the
 * time this renders — all that is left is to wait for the store to catch up
 * and get out of the way.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  useEffect(() => {
    if (status === 'authed') navigate('/', { replace: true });
    // A failed or cancelled OAuth round trip lands here with no session.
    else if (status === 'anon') navigate('/login', { replace: true });
  }, [status, error, navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4" aria-busy="true">
      <div className="w-full max-w-[400px] space-y-3">
        <span className="sr-only">Finishing sign-in…</span>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </main>
  );
}
