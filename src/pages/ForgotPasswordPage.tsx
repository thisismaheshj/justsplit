import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { fetchRecoveryChallenge, completePasswordReset } from '@/store/useRecoveryStore';
import { questionLabel } from '@/lib/securityQuestions';
import { isValidEmail, scorePassword } from '@/lib/authValidation';
import type { FieldErrors } from '@/lib/validation';

type Step = 'email' | 'answers' | 'done';
type AnswerField = 'a1' | 'a2' | 'password' | 'confirm';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [questions, setQuestions] = useState<[string, string]>(['', '']);

  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors<AnswerField>>({});

  const [banner, setBanner] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);
    if (!email.trim()) return setEmailError('Email is required');
    if (!isValidEmail(email)) return setEmailError('That does not look like an email address');
    setEmailError(undefined);

    setBusy(true);
    const result = await fetchRecoveryChallenge(email);
    setBusy(false);

    if (typeof result === 'string') return setBanner(result);
    setQuestions(result.questions);
    setStep('answers');
  }

  async function onResetSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);

    const next: FieldErrors<AnswerField> = {};
    if (!a1.trim()) next.a1 = 'Answer this question';
    if (!a2.trim()) next.a2 = 'Answer this question';
    const strength = scorePassword(password);
    if (!password) next.password = 'Choose a new password';
    else if (!strength.valid) next.password = strength.hint ?? 'Choose a stronger password';
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const outcome = await completePasswordReset({ email, answers: [a1, a2], newPassword: password });
    setBusy(false);

    if (outcome.ok) return setStep('done');
    setBanner(outcome.error ?? 'Could not reset your password.');
    setAttemptsLeft(outcome.attemptsLeft ?? null);
    if (outcome.lockedUntil) setLocked(true);
  }

  if (step === 'done') {
    return (
      <AuthCard title="Password updated" subtitle="You can sign in with it now">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <CheckCircle2 className="size-8 text-positive" aria-hidden />
          <p className="text-body text-muted-foreground">
            For safety, every other device has been signed out. You will need to sign in again
            anywhere you were already using JustSplit.
          </p>
          <Button size="lg" className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Go to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (step === 'email') {
    return (
      <AuthCard
        title="Reset your password"
        subtitle="Answer your security questions — no email needed"
        error={banner}
        footer={
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <form onSubmit={onEmailSubmit} noValidate className="flex flex-col gap-4">
          <Field id="email" label="Email" error={emailError}>
            {(p) => (
              <Input
                {...p} type="email" autoComplete="email" autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(undefined); }}
              />
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Continue
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Answer your questions"
      subtitle={email}
      error={banner}
      footer={
        <button
          type="button"
          onClick={() => { setStep('email'); setBanner(null); setLocked(false); }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      }
    >
      <form onSubmit={onResetSubmit} noValidate className="flex flex-col gap-4">
        <Field id="a1" label={questionLabel(questions[0])} error={errors.a1}>
          {(p) => (
            <Input {...p} autoComplete="off" autoFocus placeholder="Your answer"
              value={a1} onChange={(e) => setA1(e.target.value)} />
          )}
        </Field>

        <Field id="a2" label={questionLabel(questions[1])} error={errors.a2}>
          {(p) => (
            <Input {...p} autoComplete="off" placeholder="Your answer"
              value={a2} onChange={(e) => setA2(e.target.value)} />
          )}
        </Field>

        <hr className="border-border" />

        <Field id="password" label="New password" error={errors.password}>
          {(p) => (
            <>
              <Input {...p} type="password" autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <PasswordStrengthMeter password={password} />
            </>
          )}
        </Field>

        <Field id="confirm" label="Confirm new password" error={errors.confirm}>
          {(p) => (
            <Input {...p} type="password" autoComplete="new-password" placeholder="Type it again"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          )}
        </Field>

        {attemptsLeft !== null && attemptsLeft > 0 && !locked && (
          <p className="text-caption text-muted-foreground" aria-live="polite">
            {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left before recovery locks
            for 15 minutes.
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={locked}>
          {locked ? 'Locked — try again later' : 'Set new password'}
        </Button>
      </form>
    </AuthCard>
  );
}
