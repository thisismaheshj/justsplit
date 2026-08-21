import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useAuthStore } from '@/store/useAuthStore';
import { validateSignIn, type SignInField } from '@/lib/authValidation';
import type { FieldErrors } from '@/lib/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<SignInField>>({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  /** Drop a field's error the moment the user starts fixing it. */
  function edit<T>(field: SignInField, set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };
  }

  /** Where the user was headed before the guard bounced them here. */
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    const result = validateSignIn({ email, password });
    setErrors(result.errors);
    if (!result.valid) return;

    setBusy(true);
    const ok = await signInWithEmail({ email, password });
    setBusy(false);
    if (ok) navigate(from, { replace: true });
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to pick up where you left off"
      error={error}
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton
        label="Continue with Google"
        loading={googleBusy}
        onClick={() => {
          setGoogleBusy(true);
          void signInWithGoogle().then((ok) => {
            if (!ok) setGoogleBusy(false);
          });
        }}
      />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-caption text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field id="email" label="Email" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => edit<string>('email', setEmail)(e.target.value)}
            />
          )}
        </Field>

        <Field id="password" label="Password" error={errors.password}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => edit<string>('password', setPassword)(e.target.value)}
            />
          )}
        </Field>

        <div className="-mt-1 text-right">
          <Link
            to="/forgot-password"
            className="text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
