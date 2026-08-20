import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AmountField } from './AmountField';
import { PayerSelector } from './PayerSelector';
import { ParticipantSelector } from './ParticipantSelector';
import { SplitSection } from './SplitSection';
import { CategoryPicker } from './CategoryPicker';
import { RecurringToggle } from './RecurringToggle';
import { amountToText, useSplitForm } from './useSplitForm';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';

import { useGroupStore } from '@/store/useGroupStore';
import { selectActivePeople, selectLastPayer } from '@/store/selectors';
import { validateExpense, type ExpenseField, type FieldErrors } from '@/lib/validation';
import { todayString } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Expense, RecurringFrequency } from '@/types';
import { Users } from 'lucide-react';

interface AddExpenseFormProps {
  /** Present in edit mode. */
  expense?: Expense;
}

export function AddExpenseForm({ expense }: AddExpenseFormProps) {
  const navigate = useNavigate();
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';
  const isEditing = Boolean(expense);

  /**
   * In edit mode the original participants must stay selectable even if some
   * of them have since been archived, so history can still be corrected.
   */
  const people = useMemo(() => {
    const active = selectActivePeople(store);
    if (!expense) return active;
    const extraIds = new Set(
      [expense.paidBy, ...expense.participants.map((p) => p.personId)].filter(
        (id) => !active.some((p) => p.id === id),
      ),
    );
    const extras = store.people.filter((p) => extraIds.has(p.id));
    return [...active, ...extras];
  }, [store, expense]);

  const form = useSplitForm(people, currency, {
    amountText: expense ? amountToText(expense.amount, currency) : undefined,
    splitMethod: expense?.splitMethod,
    selected: expense?.participants.map((p) => p.personId),
    participants: expense?.participants,
  });

  const [description, setDescription] = useState(expense?.description ?? '');
  const [paidBy, setPaidBy] = useState(
    () => expense?.paidBy ?? selectLastPayer(store) ?? people[0]?.id ?? '',
  );
  const [category, setCategory] = useState(expense?.category ?? 'other');
  const [date, setDate] = useState(expense?.date ?? todayString());
  const [note, setNote] = useState(expense?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(Boolean(expense?.note));

  const [repeat, setRepeat] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [endDate, setEndDate] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const validation = useMemo(
    () =>
      validateExpense({
        description,
        amount: form.amount,
        paidBy,
        participants: form.participantInputs,
        splitMethod: form.splitMethod,
        date,
      }),
    [description, form.amount, paidBy, form.participantInputs, form.splitMethod, date],
  );

  // Errors surface once a field has been visited or a save was attempted, so
  // the form is never red on first load.
  const [touched, setTouched] = useState<Set<ExpenseField>>(new Set());
  const touch = (field: ExpenseField) => setTouched((current) => new Set(current).add(field));

  const errors: FieldErrors<ExpenseField> = Object.fromEntries(
    Object.entries(validation.errors).filter(([field]) =>
      submitted || touched.has(field as ExpenseField),
    ),
  );
  const endDateError =
    repeat && endDate && endDate < date
      ? 'End date must be on or after the expense date'
      : undefined;

  const canSave = validation.valid && !endDateError;
  const blockingHint = describeBlocker(validation.errors, endDateError);

  if (people.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No one to split with"
        description="Add at least one person to your group before recording an expense."
        action={
          <Button onClick={() => navigate('/people')}>Go to People</Button>
        }
      />
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (!canSave) {
      amountRef.current?.focus();
      return;
    }

    setSaving(true);
    // Short committed state so the tap registers before we navigate away.
    window.setTimeout(() => {
      const payload = {
        description,
        amount: form.amount,
        paidBy,
        participants: form.participantInputs,
        splitMethod: form.splitMethod,
        category,
        date,
        note,
      };

      try {
        if (expense) {
          store.updateExpense(expense.id, payload);
          toast.success('Expense updated');
          navigate(`/expenses/${expense.id}`, { replace: true });
          return;
        }

        if (repeat) {
          // The expense being entered is the first occurrence; the template
          // schedules everything after it.
          const templateId = store.addRecurringExpense({
            ...payload,
            frequency,
            startDate: date,
            endDate: endDate || undefined,
            firstOccurrenceCreated: true,
          });
          store.addExpense({ ...payload, recurringExpenseId: templateId });
          toast.success('Expense added and set to repeat', {
            description: `Repeats ${frequency === 'weekly' ? 'every week' : 'every month'}.`,
          });
        } else {
          store.addExpense(payload);
          toast.success('Expense added');
        }
        navigate('/home');
      } catch (error) {
        setSaving(false);
        toast.error(error instanceof Error ? error.message : 'Could not save that expense');
      }
    }, 180);
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 pb-24 md:pb-8">
        <AmountField
          ref={amountRef}
          id="expense-amount"
          autoFocus
          value={form.amountText}
          onChange={form.setAmountText}
          currency={currency}
          error={errors.amount}
          onBlur={() => touch('amount')}
          aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
        />
        {errors.amount && (
          <p id="expense-amount-error" className="-mt-4 text-caption text-negative">
            {errors.amount}
          </p>
        )}

        <Field id="expense-description" label="Description" error={errors.description}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={description}
              placeholder="Dinner, taxi, groceries…"
              maxLength={80}
              autoComplete="off"
              onBlur={() => touch('description')}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </Field>

        <Section title="Paid by" error={errors.paidBy}>
          <PayerSelector people={people} value={paidBy} onChange={setPaidBy} />
        </Section>

        <Section title="Split between" error={errors.participants}>
          <ParticipantSelector
            people={people}
            selected={form.selected}
            onToggle={form.toggleParticipant}
            onSelectAll={form.selectAll}
            onClear={form.clearAll}
          />
        </Section>

        <Section title="How to split" error={errors.split}>
          <SplitSection form={form} people={people} currency={currency} />
        </Section>

        <Section title="Category">
          <CategoryPicker categories={store.categories} value={category} onChange={setCategory} />
        </Section>

        <Field id="expense-date" label="Date" error={errors.date}>
          {(fieldProps) => <DatePicker {...fieldProps} value={date} onChange={setDate} />}
        </Field>

        <div className="rounded-2xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setNoteOpen((open) => !open)}
            aria-expanded={noteOpen}
            aria-controls="expense-note-region"
            className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-3 text-body font-medium"
          >
            Add a note
            <ChevronDown
              className={cn('size-4 text-muted-foreground transition-transform', noteOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
          <AnimatePresence initial={false}>
            {noteOpen && (
              <motion.div
                id="expense-note-region"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <Textarea
                    id="expense-note"
                    aria-label="Note"
                    value={note}
                    maxLength={280}
                    placeholder="Anything worth remembering about this one"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isEditing && (
          <RecurringToggle
            enabled={repeat}
            onEnabledChange={setRepeat}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            endDate={endDate}
            onEndDateChange={setEndDate}
            startDate={date}
            error={endDateError}
          />
        )}

        {isEditing && expense?.recurringExpenseId && (
          <p className="rounded-xl bg-muted px-4 py-3 text-caption text-muted-foreground">
            This expense came from a repeating template. Editing it here changes only this one
            occurrence.
          </p>
        )}

        {blockingHint && (
          <p role="status" aria-live="polite" className="text-body text-muted-foreground">
            {blockingHint}
          </p>
        )}

        <div
          className={cn(
            'safe-bottom fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t border-border bg-background/95 p-4 backdrop-blur',
            'md:static md:inset-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none',
          )}
        >
          {isEditing && (
            <Button
              type="button"
              variant="secondary"
              className="text-negative"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            loading={saving}
            disabled={!canSave}
            className="flex-1 md:flex-none md:px-8"
          >
            <Save aria-hidden />
            {isEditing ? 'Save changes' : 'Save expense'}
          </Button>
        </div>
      </form>

      {expense && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this expense?"
          description={`"${expense.description}" will be removed and everyone's balance will update. This can't be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            store.deleteExpense(expense.id);
            toast.success('Expense deleted');
            navigate('/expenses', { replace: true });
          }}
        />
      )}
    </>
  );
}

/** One short sentence naming what still stands between the user and Save. */
function describeBlocker(
  errors: FieldErrors<ExpenseField>,
  endDateError: string | undefined,
): string | null {
  if (errors.amount) return 'Enter an amount to save this expense.';
  if (errors.description) return 'Add a description to save this expense.';
  if (errors.participants) return 'Pick at least one person to split with.';
  if (errors.paidBy) return 'Choose who paid.';
  if (errors.split) return 'The split needs to add up before you can save.';
  if (errors.date) return 'Pick a valid date.';
  if (endDateError) return endDateError;
  return null;
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <Label asChild>
        <h2 className="text-body font-medium">{title}</h2>
      </Label>
      {children}
      {error && <p className="text-caption text-negative">{error}</p>}
    </section>
  );
}
