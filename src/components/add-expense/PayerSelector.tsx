import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Person } from '@/types';

interface PayerSelectorProps {
  people: Person[];
  value: string;
  onChange: (personId: string) => void;
  label?: string;
}

/** Single-select avatar row — "who paid". */
export function PayerSelector({ people, value, onChange, label = 'Paid by' }: PayerSelectorProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {people.map((person) => {
        const selected = person.id === value;
        return (
          <button
            key={person.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(person.id)}
            className={cn(
              'flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-colors',
              selected
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-card hover:bg-muted',
            )}
          >
            <Avatar person={person} size="md" />
            <span
              className={cn(
                'max-w-[4rem] truncate text-caption font-medium',
                selected ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {person.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
