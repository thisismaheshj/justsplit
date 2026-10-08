import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { NumberInput } from '@/components/ui/number-input';
import { SetupPeopleStep, type DraftPerson } from './SetupPeopleStep';
import { SetupGroupStep } from './SetupGroupStep';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Logo } from '@/components/brand/Logo';
import { generateId } from '@/lib/id';
import { cn, errorMessage } from '@/lib/utils';
import { toast } from 'sonner';

const MIN_PEOPLE = 1;
const MAX_PEOPLE = 20;
const STEP_TITLES = ['Who is splitting?', 'Name everyone', 'Name your group'];
const STEP_HINTS = [
  'You can add or remove people any time later.',
  "You're already in. A photo for everyone else is optional.",
  'Pick the currency you will be spending in.',
];

function makeDraft(): DraftPerson {
  return { key: generateId(), name: '' };
}

export function SetupWizard() {
  const navigate = useNavigate();
  const createGroup = useGroupStore((s) => s.createGroup);
  const existingGroup = useGroupStore((s) => s.group);
  const profile = useAuthStore((s) => s.profile);

  const [step, setStep] = useState(0);
  const [count, setCount] = useState(2);
  // The first seat is always the signed-in account (create_group seats the
  // owner), so it starts filled in with your profile rather than blank.
  const [people, setPeople] = useState<DraftPerson[]>(() => [
    { key: generateId(), name: profile?.name ?? '', avatarPhoto: profile?.avatarUrl ?? undefined, self: true },
    makeDraft(),
  ]);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [saving, setSaving] = useState(false);

  /** Grow/shrink the draft list while preserving already-typed names. */
  const applyCount = (next: number) => {
    setCount(next);
    setPeople((current) => {
      if (next === current.length) return current;
      if (next < current.length) return current.slice(0, next);
      return [...current, ...Array.from({ length: next - current.length }, makeDraft)];
    });
  };

  const stepValid = useMemo(() => {
    if (step === 0) return count >= MIN_PEOPLE && count <= MAX_PEOPLE;
    if (step === 1) return people.every((p) => p.name.trim().length > 0);
    return groupName.trim().length > 0 && currency.length === 3;
  }, [step, count, people, groupName, currency]);

  const finish = async () => {
    if (!stepValid || saving) return;
    setSaving(true);
    try {
      await createGroup(
        groupName,
        currency,
        people.map((p) => ({ name: p.name, avatarPhoto: p.avatarPhoto })),
      );
      toast.success(`${groupName.trim()} is ready`, {
        description: 'Add your first expense to get started.',
      });
      navigate('/home', { replace: true });
    } catch (error) {
      setSaving(false);
      toast.error('Could not create that group', {
        description: errorMessage(error),
      });
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8">
      <header className="mb-8 flex flex-col gap-5">
        <Logo />

        <div>
          <div
            className="flex items-center gap-2"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={step + 1}
            aria-label={`Step ${step + 1} of 3`}
          >
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  index <= step ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-caption text-muted-foreground">Step {step + 1} of 3</p>
        </div>

        <div>
          <h1 className="text-page font-semibold">{STEP_TITLES[step]}</h1>
          <p className="mt-1 text-body text-muted-foreground">{STEP_HINTS[step]}</p>
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
              <div className="rounded-2xl border border-border bg-card p-5">
                <Field
                  id="people-count"
                  label="How many people?"
                  hint={`Between ${MIN_PEOPLE} and ${MAX_PEOPLE}.`}
                >
                  {(fieldProps) => (
                    <NumberInput
                      {...fieldProps}
                      withSteppers
                      value={count}
                      min={MIN_PEOPLE}
                      max={MAX_PEOPLE}
                      onChange={applyCount}
                    />
                  )}
                </Field>
                <p className="mt-4 flex items-center gap-2 text-caption text-muted-foreground">
                  <Users className="size-4 shrink-0" aria-hidden />
                  Everyone is added to new expenses by default.
                </p>
              </div>
            )}

            {step === 1 && <SetupPeopleStep people={people} onChange={setPeople} />}

            {step === 2 && (
              <SetupGroupStep
                name={groupName}
                currency={currency}
                onNameChange={setGroupName}
                onCurrencyChange={setCurrency}
              />
            )}
        </motion.div>
      </div>

      <footer className="safe-bottom sticky bottom-0 mt-8 flex items-center gap-3 bg-background/85 py-4 backdrop-blur-xl">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
        ) : (
          existingGroup && (
            <Button variant="ghost" onClick={() => navigate('/home')}>
              Cancel
            </Button>
          )
        )}

        <div className="flex-1" />

        {step < 2 ? (
          <Button disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            Continue
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <Button disabled={!stepValid} loading={saving} onClick={() => void finish()}>
            <Check aria-hidden />
            Create group
          </Button>
        )}
      </footer>
    </div>
  );
}
