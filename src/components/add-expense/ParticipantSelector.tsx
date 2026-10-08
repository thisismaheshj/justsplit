import { Check } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { firstName } from '@/lib/avatar';
import type { Person } from '@/types';

interface ParticipantSelectorProps {
  people: Person[];
  selected: string[];
  onToggle: (personId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

/** Multi-select avatar row — everyone is included by default. */
export function ParticipantSelector({
  people,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: ParticipantSelectorProps) {
  const allSelected = selected.length === people.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">
          {selected.length} of {people.length} included
        </p>
        <button
          type="button"
          onClick={allSelected ? onClear : onSelectAll}
          className="rounded-md px-2 py-1 text-caption font-medium text-primary hover:bg-primary-soft"
        >
          {allSelected ? 'Clear all' : 'Select everyone'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {people.map((person) => {
          const isOn = selected.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              role="checkbox"
              aria-checked={isOn}
              onClick={() => onToggle(person.id)}
              className={cn(
                'relative flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-colors',
                isOn ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:bg-muted',
              )}
            >
              <span className="relative">
                <Avatar person={person} size="md" className={cn(!isOn && 'opacity-45')} />
                {isOn && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                    <Check className="size-2.5" aria-hidden />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'max-w-[4rem] truncate text-caption font-medium',
                  isOn ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span aria-hidden>{firstName(person.name)}</span>
                <span className="sr-only">{person.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
