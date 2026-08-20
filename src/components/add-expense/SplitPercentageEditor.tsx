import { SplitList, SplitRow } from './split-row';
import type { ParticipantShare, Person } from '@/types';

/** Percentages up to 2 decimal places; the running total must hit 100.00. */
export function SplitPercentageEditor({
  people,
  values,
  onChange,
  shares,
  currency,
}: {
  people: Person[];
  values: Record<string, string>;
  onChange: (personId: string, value: string) => void;
  shares: ParticipantShare[];
  currency: string;
}) {
  return (
    <SplitList>
      {people.map((person) => (
        <SplitRow
          key={person.id}
          person={person}
          currency={currency}
          amount={shares.find((s) => s.personId === person.id)?.amountOwed}
          control={
            <span className="flex items-center gap-1">
              <input
                inputMode="decimal"
                aria-label={`Percentage for ${person.name}`}
                value={values[person.id] ?? ''}
                placeholder="0"
                onChange={(event) => onChange(person.id, sanitizePercent(event.target.value))}
                className="h-10 w-20 rounded-lg border border-input bg-card px-2 text-right text-body tabular"
              />
              <span className="text-body text-muted-foreground" aria-hidden>
                %
              </span>
            </span>
          }
        />
      ))}
    </SplitList>
  );
}

/** Digits plus at most one dot with two decimals, capped at 100. */
export function sanitizePercent(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  const [whole, fraction] = cleaned.split('.');
  const capped = whole.length > 3 ? whole.slice(0, 3) : whole;
  const value = fraction === undefined ? capped : `${capped}.${fraction.slice(0, 2)}`;
  return Number(value) > 100 ? '100' : value;
}
