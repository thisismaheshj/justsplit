import { SplitList, SplitRow } from './split-row';
import type { ParticipantShare, Person } from '@/types';

/** Equal split is read-only: the maths is fully determined by the head count. */
export function SplitEqualEditor({
  people,
  shares,
  currency,
}: {
  people: Person[];
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
          amount={shares.find((s) => s.personId === person.id)?.amountOwed ?? 0}
        />
      ))}
    </SplitList>
  );
}
