import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { AuthCard } from '@/components/auth/AuthCard';
import {
  SecurityQuestionFields,
  validateQuestionPair,
  type QuestionField,
  type QuestionPair,
} from '@/components/auth/SecurityQuestionFields';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecoveryStore } from '@/store/useRecoveryStore';
import type { FieldErrors } from '@/lib/validation';

const EMPTY: QuestionPair = { q1: '', a1: '', q2: '', a2: '' };

/**
 * Shown once, straight after an email/password signup (PRD 5.1: questions are
 * set at signup). Without email delivery these answers are the only way back
 * into an account, so this is deliberately the default path rather than
 * something buried in Settings — but it is still skippable, because trapping
 * someone in a form they do not understand is its own kind of lockout.
 */
export default function SetupRecoveryPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const questions = useRecoveryStore((s) => s.questions);
  const loaded = useRecoveryStore((s) => s.loaded);
  const load = useRecoveryStore((s) => s.load);
  const save = useRecoveryStore((s) => s.save);

  const [value, setValue] = useState<QuestionPair>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<QuestionField>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  // A Google-only account has no password, so there is nothing for these
  // questions to reset — and offering them would only add a way in that does
  // not exist today. Settings still allows it deliberately.
  const hasPassword = (user?.identities ?? []).some((i) => i.provider === 'email');

  if (loaded && questions) return <Navigate to="/" replace />;
  if (user && !hasPassword) return <Navigate to="/" replace />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = validateQuestionPair(value);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const error = await save(value);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Account recovery is set up');
    navigate('/', { replace: true });
  }

  return (
    <AuthCard
      title="Secure your account"
      subtitle="Two questions, so a forgotten password is not the end"
      footer={
        <button
          type="button"
          className="font-medium underline-offset-4 hover:underline"
          onClick={() => {
            toast('You can set this up any time in Settings → Account.');
            navigate('/', { replace: true });
          }}
        >
          I'll do this later
        </button>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-caption text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            JustSplit never emails you, so there is no reset link to fall back on. These answers
            are the only way back in if you forget your password.
          </span>
        </p>

        <SecurityQuestionFields value={value} onChange={setValue} errors={errors} />

        <Button type="submit" size="lg" loading={busy} className="w-full">
          Finish setup
        </Button>
      </form>
    </AuthCard>
  );
}
