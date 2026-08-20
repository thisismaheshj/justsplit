import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { AmountField } from '@/components/add-expense/AmountField';
import { PayerSelector } from '@/components/add-expense/PayerSelector';
import { ParticipantSelector } from '@/components/add-expense/ParticipantSelector';
import { SplitSection } from '@/components/add-expense/SplitSection';
import { CategoryPicker } from '@/components/add-expense/CategoryPicker';
import { amountToText, useSplitForm } from '@/components/add-expense/useSplitForm';

import { useGroupStore, shouldCreateFirstOccurrence } from '@/store/useGroupStore';
import { selectActivePeople, selectLastPayer } from '@/store/selectors';
import { validateRecurring } from '@/lib/validation';
import { todayString } from '@/lib/date';
import type { RecurringExpense, RecurringFrequency } from '@/types';

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: RecurringExpense;
}

export function RecurringFormDialog({ open, onOpenChange, template }: RecurringFormDialogProps) {
  // Remount the form body per open so state always starts from the template.
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-lg">
      {open && <RecurringFormBody onDone={() => onOpenChange(false)} template={template} />}
    </ResponsiveDialog>
  );
}

function RecurringFormBody({
  template,
  onDone,
}: {
  template?: RecurringExpense;
  onDone: () => void;
}) {
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';

  const people = useMemo(() => {
    const active = selectActivePeople(store);
    if (!template) return active;
    const extraIds = new Set(
      [template.paidBy, ...template.participants.map((p) => p.personId)].filter(
        (id) => !active.some((p) => p.id === id),
      ),
    );
    return [...active, ...store.people.filter((p) => extraIds.has(p.id))];
  }, [store, template]);

  const form = useSplitForm(people, currency, {
    amountText: template ? amountToText(template.amount, currency) : undefined,
    splitMethod: template?.splitMethod,
    selected: template?.participants.map((p) => p.personId),
    participants: template?.participants,
  });

  const [description, setDescription] = useState(template?.description ?? '');
  const [paidBy, setPaidBy] = useState(
    () => template?.paidBy ?? selectLastPayer(store) ?? people[0]?.id ?? '',
  );
  const [category, setCategory] = useState(template?.category ?? 'bills');
  const [frequency, setFrequency] = useState<RecurringFrequency>(template?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(template?.startDate ?? todayString());
  const [endDate, setEndDate] = useState(template?.endDate ?? '');
  const [note, setNote] = useState(template?.note ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const validation = useMemo(
    () =>
      validateRecurring({
        description,
        amount: form.amount,
        paidBy,
        participants: form.participantInputs,
        splitMethod: form.splitMethod,
        date: startDate,
        frequency,
        endDate: endDate || undefined,
      }),
    [description, form.amount, paidBy, form.participantInputs, form.splitMethod, startDate, frequency, endDate],
  );
  const errors = submitted ? validation.errors : {};

  // Keep focus in the dialog when validation blocks a save.
  useEffect(() => {
    if (submitted && !validation.valid) {
      document.getElementById('recurring-description')?.focus();
    }
  }, [submitted, validation.valid]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid) return;

    setSaving(true);
    const payload = {
      description,
      amount: form.amount,
      paidBy,
      participants: form.participantInputs,
      splitMethod: form.splitMethod,
      category,
      frequency,
      startDate,
      endDate: endDate || undefined,
      note,
    };

    try {
      if (template) {
        store.updateRecurringExpense(template.id, payload);
        toast.success('Repeating expense updated', {
          description: 'Changes apply to future occurrences only.',
        });
      } else {
        const createFirst = shouldCreateFirstOccurrence(startDate);
        const id = store.addRecurringExpense({
          ...payload,
          firstOccurrenceCreated: createFirst,
        });
        if (createFirst) {
          store.addExpense({
            description,
            amount: form.amount,
            paidBy,
            participants: form.participantInputs,
            splitMethod: form.splitMethod,
            category,
            date: startDate,
            note,
            recurringExpenseId: id,
          });
        }
        toast.success('Repeating expense created', {
          description: createFirst
            ? 'The first occurrence has been added to your history.'
            : 'The first occurrence will be added on its start date.',
        });
      }
      onDone();
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : 'Could not save that template');
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{template ? 'Edit repeating expense' : 'New repeating expense'}</DialogTitle>
        <DialogDescription>
          Each occurrence is added automatically when it falls due.
        </DialogDescription>
      </DialogHeader>

      <AmountField
        id="recurring-amount"
        value={form.amountText}
        onChange={form.setAmountText}
        currency={currency}
        error={errors.amount}
      />
      {errors.amount && <p className="-mt-3 text-caption text-negative">{errors.amount}</p>}

      <Field id="recurring-description" label="Description" error={errors.description}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={description}
            placeholder="Rent, Netflix, gym…"
            maxLength={80}
            autoComplete="off"
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <Label>Paid by</Label>
        <PayerSelector people={people} value={paidBy} onChange={setPaidBy} />
        {errors.paidBy && <p className="text-caption text-negative">{errors.paidBy}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Split between</Label>
        <ParticipantSelector
          people={people}
          selected={form.selected}
          onToggle={form.toggleParticipant}
          onSelectAll={form.selectAll}
          onClear={form.clearAll}
        />
        {errors.participants && (
          <p className="text-caption text-negative">{errors.participants}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>How to split</Label>
        <SplitSection form={form} people={people} currency={currency} />
        {errors.split && <p className="text-caption text-negative">{errors.split}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Category</Label>
        <CategoryPicker categories={store.categories} value={category} onChange={setCategory} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>How often</Label>
        <SegmentedControl
          id="recurring-frequency"
          label="How often"
          value={frequency}
          onChange={setFrequency}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="recurring-start" label="Starts on" error={errors.date}>
          {(fieldProps) => (
            <DatePicker
              {...fieldProps}
              value={startDate}
              disabled={Boolean(template)}
              onChange={setStartDate}
            />
          )}
        </Field>
        <Field id="recurring-end" label="Ends on" optional error={errors.endDate}>
          {(fieldProps) => (
            <DatePicker {...fieldProps} value={endDate} min={startDate} onChange={setEndDate} />
          )}
        </Field>
      </div>

      <Field id="recurring-note" label="Note" optional>
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={note}
            maxLength={280}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </Field>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {template ? 'Save changes' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
}
