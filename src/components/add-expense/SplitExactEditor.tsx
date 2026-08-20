import { SplitList, SplitRow } from './split-row';
import { sanitizeAmountInput } from './AmountField';
import { currencySymbol } from '@/lib/currency';
import type { Person } from '@/types';

/** Each participant's exact amount, entered in major units. */
export function SplitExactEditor({
  people,
  values,
  onChange,
  currency,
}: {
  people: Person[];
  values: Record<string, string>;
  onChange: (personId: string, value: string) => void;
  currency: string;
}) {
  return (
    <SplitList>
      {people.map((person) => (
        <SplitRow
          key={person.id}
          person={person}
          currency={currency}
          control={
            <span className="flex items-center gap-1.5">
              <span className="text-body text-muted-foreground" aria-hidden>
                {currencySymbol(currency)}
              </span>
              <input
                inputMode="decimal"
                aria-label={`Amount for ${person.name}`}
                value={values[person.id] ?? ''}
                placeholder="0"
                onChange={(event) =>
                  onChange(person.id, sanitizeAmountInput(event.target.value, currency))
                }
                className="h-10 w-24 rounded-lg border border-input bg-card px-2 text-right text-body tabular"
              />
            </span>
          }
        />
      ))}
    </SplitList>
  );
}
