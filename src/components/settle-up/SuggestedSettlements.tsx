import { ArrowRight, PartyPopper } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { formatAbsCurrency } from '@/lib/currency';
import type { DebtTransfer, Person } from '@/types';

/** Tappable chips generated from simplifyDebts() — one tap pre-fills the form. */
export function SuggestedSettlements({
  transfers,
  people,
  currency,
  onSelect,
}: {
  transfers: DebtTransfer[];
  people: Person[];
  currency: string;
  onSelect: (transfer: DebtTransfer) => void;
}) {
  if (transfers.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <PartyPopper className="size-6 text-positive" aria-hidden />
        <p className="text-section font-semibold">Everyone is settled 🎉</p>
        <p className="text-body text-muted-foreground">
          You can still record a payment below if you want it on the books.
        </p>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transfers.map((transfer) => {
        const from = people.find((p) => p.id === transfer.from);
        const to = people.find((p) => p.id === transfer.to);
        if (!from || !to) return null;

        return (
          <li key={`${transfer.from}-${transfer.to}`}>
            <button
              type="button"
              onClick={() => onSelect(transfer)}
              className="flex w-full min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary-soft"
            >
              <span className="flex items-center gap-1.5">
                <Avatar person={from} size="sm" />
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                <Avatar person={to} size="sm" />
              </span>
              <span className="min-w-0 flex-1 text-body">
                <span className="font-medium">{from.name}</span> pays{' '}
                <span className="font-medium">{to.name}</span>
              </span>
              <span className="shrink-0 text-label font-semibold tabular">
                {formatAbsCurrency(transfer.amount, currency)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
