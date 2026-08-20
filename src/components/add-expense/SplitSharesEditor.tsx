import { Minus, Plus } from 'lucide-react';
import { SplitList, SplitRow } from './split-row';
import type { ParticipantShare, Person } from '@/types';

const MAX_SHARES = 99;

/** Whole share units per person, defaulting to 1 each. */
export function SplitSharesEditor({
  people,
  values,
  onChange,
  shares,
  currency,
}: {
  people: Person[];
  values: Record<string, number>;
  onChange: (personId: string, value: number) => void;
  shares: ParticipantShare[];
  currency: string;
}) {
  return (
    <SplitList>
      {people.map((person) => {
        const count = values[person.id] ?? 1;
        return (
          <SplitRow
            key={person.id}
            person={person}
            currency={currency}
            amount={shares.find((s) => s.personId === person.id)?.amountOwed}
            control={
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Fewer shares for ${person.name}`}
                  disabled={count <= 1}
                  onClick={() => onChange(person.id, Math.max(1, count - 1))}
                  className="flex size-9 items-center justify-center rounded-lg border border-input text-muted-foreground disabled:opacity-40 hover:bg-muted"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <input
                  inputMode="numeric"
                  aria-label={`Shares for ${person.name}`}
                  value={count}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/\D/g, ''));
                    onChange(person.id, Math.min(MAX_SHARES, Math.max(1, next || 1)));
                  }}
                  className="h-9 w-12 rounded-lg border border-input bg-card text-center text-body tabular"
                />
                <button
                  type="button"
                  aria-label={`More shares for ${person.name}`}
                  disabled={count >= MAX_SHARES}
                  onClick={() => onChange(person.id, Math.min(MAX_SHARES, count + 1))}
                  className="flex size-9 items-center justify-center rounded-lg border border-input text-muted-foreground disabled:opacity-40 hover:bg-muted"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </span>
            }
          />
        );
      })}
    </SplitList>
  );
}
