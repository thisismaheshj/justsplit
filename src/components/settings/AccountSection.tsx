import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LogOut, ShieldCheck, ShieldAlert } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { colorFromString } from '@/lib/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SecurityQuestionFields, validateQuestionPair, type QuestionPair, type QuestionField }
  from '@/components/auth/SecurityQuestionFields';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecoveryStore } from '@/store/useRecoveryStore';
import { questionLabel } from '@/lib/securityQuestions';
import type { FieldErrors } from '@/lib/validation';

const EMPTY: QuestionPair = { q1: '', a1: '', q2: '', a2: '' };

export function AccountSection() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const questions = useRecoveryStore((s) => s.questions);
  const loaded = useRecoveryStore((s) => s.loaded);
  const load = useRecoveryStore((s) => s.load);
  const save = useRecoveryStore((s) => s.save);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<QuestionPair>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<QuestionField>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { void load(); }, [load]);

  const providers = (user?.identities ?? []).map((i) => i.provider);
  const hasPassword = providers.includes('email');

  async function onSave() {
    const next = validateQuestionPair(value);
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const error = await save(value);
    setBusy(false);
    if (error) return toast.error(error);

    toast.success(questions ? 'Security questions updated' : 'Recovery set up');
    setValue(EMPTY);
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-3 p-5">
        <Avatar
          size="lg"
          person={{
            name: profile?.name || 'You',
            // Same deterministic colour scheme group members use, keyed on the
            // account id so it stays stable across renames.
            avatarColor: colorFromString(profile?.id ?? user?.id ?? 'you'),
            avatarPhoto: profile?.avatarUrl ?? undefined,
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-medium">{profile?.name || 'You'}</p>
          <p className="truncate text-caption text-muted-foreground">{profile?.email}</p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Signs in with {providers.length ? providers.join(' and ') : 'this device'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void signOut()}>
          <LogOut aria-hidden /> Sign out
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-start gap-3">
          {questions ? (
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-positive" aria-hidden />
          ) : (
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-label font-medium">Password recovery</p>
            <p className="text-body text-muted-foreground">
              {!loaded
                ? 'Checking…'
                : questions
                  ? 'Set up. These questions let you reset your password without email.'
                  : hasPassword
                    ? 'Not set up. Without this you cannot reset a forgotten password.'
                    : 'Not set up. You sign in with Google, so this is optional — add it only if you also want a password.'}
            </p>
          </div>
        </div>

        {loaded && questions && !editing && (
          <ul className="mb-4 flex flex-col gap-1">
            {questions.map((q) => (
              <li key={q} className="text-caption text-muted-foreground">— {questionLabel(q)}</li>
            ))}
          </ul>
        )}

        {editing ? (
          <div className="flex flex-col gap-4">
            <SecurityQuestionFields value={value} onChange={setValue} errors={errors} />
            <div className="flex gap-2">
              <Button onClick={onSave} loading={busy}>Save</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); setValue(EMPTY); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          loaded && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {questions ? 'Change questions' : 'Set up recovery'}
            </Button>
          )
        )}
      </Card>
    </div>
  );
}
