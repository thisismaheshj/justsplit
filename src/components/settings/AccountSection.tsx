import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Camera, LogOut, ShieldCheck, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SecurityQuestionFields, validateQuestionPair, type QuestionPair, type QuestionField }
  from '@/components/auth/SecurityQuestionFields';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecoveryStore } from '@/store/useRecoveryStore';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
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
  const [editingProfile, setEditingProfile] = useState(false);

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
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            aria-label="Change your photo"
            className="relative shrink-0 rounded-full"
          >
            <ProfileAvatar size="xl" />
            <span
              className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-card"
              aria-hidden
            >
              <Camera className="size-3.5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-section font-semibold">{profile?.name || 'You'}</p>
            <p className="truncate text-body text-muted-foreground">{profile?.email}</p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Signs in with {providers.length ? providers.join(' and ') : 'this device'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="min-h-12 text-body font-medium text-primary transition-colors hover:bg-muted active:bg-muted"
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-12 items-center justify-center gap-2 text-body font-medium text-negative transition-colors hover:bg-negative-soft active:bg-negative-soft"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </Card>

      <EditProfileDialog open={editingProfile} onOpenChange={setEditingProfile} />

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
