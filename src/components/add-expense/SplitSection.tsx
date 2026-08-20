import { AlertTriangle, CheckCircle2, Info, Wand2 } from 'lucide-react';
import { SplitMethodTabs } from './SplitMethodTabs';
import { SplitEqualEditor } from './SplitEqualEditor';
import { SplitExactEditor } from './SplitExactEditor';
import { SplitPercentageEditor } from './SplitPercentageEditor';
import { SplitSharesEditor } from './SplitSharesEditor';
import type { SplitFormState } from './useSplitForm';
import type { Person } from '@/types';
import { formatAbsCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

/**
 * Split method picker + the matching per-person editor + a live indicator
 * telling the user exactly how far off the split currently is.
 */
export function SplitSection({
  form,
  people,
  currency,
}: {
  form: SplitFormState;
  people: Person[];
  currency: string;
}) {
  const participants = people.filter((p) => form.selected.includes(p.id));
  const { validation, splitMethod } = form;

  if (participants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-body text-muted-foreground">
        Choose at least one person to split with.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SplitMethodTabs value={splitMethod} onChange={form.setSplitMethod} />

      {splitMethod === 'equal' && (
        <SplitEqualEditor people={participants} shares={form.preview} currency={currency} />
      )}
      {splitMethod === 'exact' && (
        <SplitExactEditor
          people={participants}
          values={form.exactValues}
          onChange={form.setExactValue}
          currency={currency}
        />
      )}
      {splitMethod === 'percentage' && (
        <SplitPercentageEditor
          people={participants}
          values={form.percentValues}
          onChange={form.setPercentValue}
          shares={form.preview}
          currency={currency}
        />
      )}
      {splitMethod === 'shares' && (
        <SplitSharesEditor
          people={participants}
          values={form.shareValues}
          onChange={form.setShareValue}
          shares={form.preview}
          currency={currency}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {form.amount <= 0 ? (
          // Nothing has been entered yet — stay neutral rather than shouting.
          <SplitStatus tone="pending" message="Enter an amount to see the split" />
        ) : (
          <SplitStatus
            tone={validation.valid ? 'valid' : 'invalid'}
            message={
              validation.valid
                ? validation.message
                : describeGap(splitMethod, validation.difference, validation.error, currency)
            }
          />
        )}

        {splitMethod !== 'equal' && (
          <button
            type="button"
            onClick={form.distributeEvenly}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-caption font-medium text-primary hover:bg-primary-soft"
          >
            <Wand2 className="size-3.5" aria-hidden />
            Split evenly
          </button>
        )}
      </div>
    </div>
  );
}

function SplitStatus({
  tone,
  message,
}: {
  tone: 'valid' | 'invalid' | 'pending';
  message: string;
}) {
  const Icon = tone === 'valid' ? CheckCircle2 : tone === 'invalid' ? AlertTriangle : Info;
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 text-body font-medium',
        tone === 'valid' && 'text-positive',
        tone === 'invalid' && 'text-negative',
        tone === 'pending' && 'text-muted-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/** Turns the raw validation delta into plain language. */
function describeGap(
  method: string,
  difference: number,
  error: string | undefined,
  currency: string,
): string {
  if (error && error !== 'unassigned' && error !== 'over') return error;

  if (method === 'percentage') {
    const percent = Math.abs(difference) / 100;
    return difference > 0 ? `${percent}% left to assign` : `${percent}% over 100%`;
  }
  return difference > 0
    ? `${formatAbsCurrency(difference, currency)} left to assign`
    : `${formatAbsCurrency(difference, currency)} over`;
}
