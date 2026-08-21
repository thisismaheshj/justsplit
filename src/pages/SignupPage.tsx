import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { useAuthStore } from '@/store/useAuthStore';
import { validateSignUp, type SignUpField } from '@/lib/authValidation';
import type { FieldErrors } from '@/lib/validation';

export default function SignupPage() {
  const navigate = useNavigate();
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  /** Drop a field's error the moment the user starts fixing it. */
  function edit<T>(field: SignUpField, set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    const result = validateSignUp({ name, email, password, confirmPassword });
    setErrors(result.errors);
    if (!result.valid) return;

    setBusy(true);
    const ok = await signUpWithEmail({ name, email, password });
    setBusy(false);
    // Straight into recovery setup: these answers are the only way back into an
    // email/password account, and asking later means most people never do it.
    if (ok) navigate('/setup-recovery', { replace: true });
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Split expenses without the spreadsheet"
      error={error}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
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
        <Field id="name" label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              autoFocus
              placeholder="Mahesh"
              value={name}
              onChange={(e) => edit<string>('name', setName)(e.target.value)}
            />
          )}
        </Field>

        <Field id="email" label="Email" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => edit<string>('email', setEmail)(e.target.value)}
            />
          )}
        </Field>

        <Field id="password" label="Password" error={errors.password}>
          {(p) => (
            <>
              <Input
                {...p}
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => edit<string>('password', setPassword)(e.target.value)}
              />
              <PasswordStrengthMeter password={password} />
            </>
          )}
        </Field>

        <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              placeholder="Type it again"
              value={confirmPassword}
              onChange={(e) => edit<string>('confirmPassword', setConfirmPassword)(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
