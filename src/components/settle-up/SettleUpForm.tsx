import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HandCoins, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section-header';
import { AmountField, sanitizeAmountInput } from '@/components/add-expense/AmountField';
import { PayerSelector } from '@/components/add-expense/PayerSelector';
import { SuggestedSettlements } from './SuggestedSettlements';

import { useGroupStore } from '@/store/useGroupStore';
import { selectActivePeople, selectSimplifiedDebts } from '@/store/selectors';
import { validateSettlement } from '@/lib/validation';
import { toInputString, toMinorUnits } from '@/lib/currency';
import { todayString } from '@/lib/date';
import type { DebtTransfer } from '@/types';

export function SettleUpForm() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';

  const editId = searchParams.get('edit');
  const editing = store.settlements.find((s) => s.id === editId);

  const transfers = selectSimplifiedDebts(store);
  const activePeople = selectActivePeople(store);

  /** Editing keeps archived participants visible so old records stay editable. */
  const people = useMemo(() => {
    if (!editing) return activePeople;
    const extras = store.people.filter(
      (p) => (p.id === editing.from || p.id === editing.to) && !activePeople.some((a) => a.id === p.id),
    );
    return [...activePeople, ...extras];
  }, [activePeople, editing, store.people]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(todayString());
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Seed from ?edit=, or from a ?from&to&amount deep link out of Home.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    if (editing) {
      setFrom(editing.from);
      setTo(editing.to);
      setAmountText(toInputString(editing.amount, currency));
      setDate(editing.date);
      setNote(editing.note ?? '');
      return;
    }

    const qFrom = searchParams.get('from');
    const qTo = searchParams.get('to');
    const qAmount = searchParams.get('amount');
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qAmount && Number.isFinite(Number(qAmount))) {
      setAmountText(toInputString(Number(qAmount), currency));
    }
  }, [editing, searchParams, currency]);

  const amount = amountText.trim() ? toMinorUnits(amountText, currency) : 0;

  const validation = useMemo(
    () => validateSettlement({ from, to, amount, date }),
    [from, to, amount, date],
  );
  const errors = submitted ? validation.errors : {};

  const applySuggestion = (transfer: DebtTransfer) => {
    setFrom(transfer.from);
    setTo(transfer.to);
    setAmountText(toInputString(transfer.amount, currency));
    setSubmitted(false);
    // Drop any stale deep-link params so a later edit does not re-seed.
    setSearchParams({}, { replace: true });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid) {
      amountRef.current?.focus();
      return;
    }

    setSaving(true);
    window.setTimeout(() => {
      const payload = { from, to, amount, date, note };
      if (editing) {
        store.updateSettlement(editing.id, payload);
        toast.success('Settlement updated');
      } else {
        store.addSettlement(payload);
        const fromName = people.find((p) => p.id === from)?.name ?? 'Payment';
        const toName = people.find((p) => p.id === to)?.name ?? '';
        toast.success('Settlement recorded', {
          description: `${fromName} paid ${toName}. Balances are up to date.`,
        });
      }
      navigate('/home');
    }, 180);
  };

  return (
    <div className="flex flex-col gap-8">
      {!editing && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Suggested settlements"
            description="The fewest payments that clear everyone's balance."
          />
          <SuggestedSettlements
            transfers={transfers}
            people={store.people}
            currency={currency}
            onSelect={applySuggestion}
          />
        </section>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-6 pb-24 md:pb-8">
        <SectionHeader
          title={editing ? 'Edit settlement' : 'Record a payment'}
          description="Balances update the moment you save."
        />

        <Card className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <p className="text-body font-medium">Who paid</p>
            <PayerSelector
              people={people}
              value={from}
              onChange={(id) => {
                setFrom(id);
                if (id === to) setTo('');
              }}
              label="Who paid"
            />
            {errors.from && <p className="text-caption text-negative">{errors.from}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-body font-medium">Who received it</p>
            <PayerSelector
              people={people.filter((p) => p.id !== from)}
              value={to}
              onChange={setTo}
              label="Who received it"
            />
            {errors.to && <p className="text-caption text-negative">{errors.to}</p>}
          </div>
        </Card>

        <AmountField
          ref={amountRef}
          id="settle-amount"
          value={amountText}
          onChange={(value) => setAmountText(sanitizeAmountInput(value, currency))}
          currency={currency}
          error={errors.amount}
        />
        {errors.amount && <p className="-mt-4 text-caption text-negative">{errors.amount}</p>}

        <Field id="settle-date" label="Date" error={errors.date}>
          {(fieldProps) => <DatePicker {...fieldProps} value={date} onChange={setDate} />}
        </Field>

        {!validation.valid && (
          <p role="status" aria-live="polite" className="text-body text-muted-foreground">
            {validation.errors.from ??
              validation.errors.to ??
              validation.errors.amount ??
              validation.errors.date}
          </p>
        )}

        <Field id="settle-note" label="Note" optional>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={note}
              maxLength={280}
              placeholder="Cash, UPI, bank transfer…"
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>

        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl md:static md:inset-auto md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          {editing && (
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
            disabled={!validation.valid}
            className="flex-1 md:flex-none md:px-8"
          >
            <HandCoins aria-hidden />
            {editing ? 'Save changes' : 'Record settlement'}
          </Button>
        </div>
      </form>

      {editing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this settlement?"
          description="The payment will be removed and balances will go back to what they were. This can't be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            store.deleteSettlement(editing.id);
            toast.success('Settlement deleted');
            navigate('/expenses', { replace: true });
          }}
        />
      )}
    </div>
  );
}
