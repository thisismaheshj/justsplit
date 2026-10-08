import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SetupGroupStep } from './SetupGroupStep';
import { AccountSearch } from '@/components/people/AccountSearch';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Logo } from '@/components/brand/Logo';
import type { AccountMatch } from '@/lib/groupsApi';
import { colorFromString } from '@/lib/avatar';
import { cn, errorMessage } from '@/lib/utils';

const STEPS = [
  { title: 'Name your group', hint: 'A trip, a flat, a dinner club — anything you split costs in.' },
  { title: 'Add people', hint: 'Search for friends who have an account. The group shows up for them as soon as they sign in.' },
];

export function SetupWizard() {
  const navigate = useNavigate();
  const createGroup = useGroupStore((s) => s.createGroup);
  const profile = useAuthStore((s) => s.profile);

  const [step, setStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [members, setMembers] = useState<AccountMatch[]>([]);
  const [saving, setSaving] = useState(false);

  const stepValid = step === 0 ? groupName.trim().length > 0 && currency.length === 3 : true;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await createGroup(groupName, currency, members);
      toast.success(`${groupName.trim()} is ready`, {
        description: members.length
          ? `${members.length} ${members.length === 1 ? 'person' : 'people'} added. Add your first expense.`
          : 'Add your first expense, or add people from the People tab.',
      });
      navigate('/home', { replace: true });
    } catch (error) {
      setSaving(false);
      toast.error('Could not create that group', { description: errorMessage(error) });
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mb-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} aria-label="Cancel">
            <X aria-hidden />
          </Button>
        </div>

        <div
          className="flex items-center gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={cn('h-1 flex-1 rounded-full transition-colors', index <= step ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </div>

        <div>
          <h1 className="text-page font-semibold">{STEPS[step].title}</h1>
          <p className="mt-1 text-body text-muted-foreground">{STEPS[step].hint}</p>
        </div>
      </header>

      <div className="flex-1">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {step === 0 && (
            <SetupGroupStep
              name={groupName}
              currency={currency}
              onNameChange={setGroupName}
              onCurrencyChange={setCurrency}
            />
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <ProfileAvatar size="md" />
                  <span className="min-w-0 flex-1 truncate text-body font-medium">{profile?.name || 'You'}</span>
                  <Badge variant="primary">You</Badge>
                </li>
                {members.map((m) => (
                  <li key={m.userId} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                    <Avatar
                      person={{ name: m.name, avatarColor: colorFromString(m.userId), avatarPhoto: m.avatarUrl }}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium">{m.name}</span>
                      {m.emailHint && <span className="block truncate text-caption text-muted-foreground">{m.emailHint}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMembers((cur) => cur.filter((x) => x.userId !== m.userId))}
                      aria-label={`Remove ${m.name}`}
                      className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <AccountSearch
                autoFocus
                excludeUserIds={members.map((m) => m.userId)}
                onSelect={(account) => setMembers((cur) => [...cur, account])}
              />
            </div>
          )}
        </motion.div>
      </div>

      <footer className="safe-bottom sticky bottom-0 mt-8 flex items-center gap-3 bg-background/85 py-4 backdrop-blur-xl">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
        )}

        <div className="flex-1" />

        {step < STEPS.length - 1 ? (
          <Button disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            Continue
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button loading={saving} onClick={() => void finish()}>
            <Check aria-hidden />
            {members.length ? 'Create group' : 'Create with just me'}
          </Button>
        )}
      </footer>
    </div>
  );
}
