import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAbsCurrency } from '@/lib/currency';
import type { DebtTransfer, Person } from '@/types';

/** Simplified "who owes who" plan, each row deep-linking into Settle Up. */
export function WhoOwesWho({
  transfers,
  people,
  currency,
}: {
  transfers: DebtTransfer[];
  people: Person[];
  currency: string;
}) {
  const byId = (id: string) => people.find((p) => p.id === id);

  if (transfers.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <PartyPopper className="size-6 text-positive" aria-hidden />
        <p className="text-section font-semibold">Everyone is settled 🎉</p>
        <p className="text-body text-muted-foreground">
          No money is owed between anyone in this group right now.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      <AnimatePresence initial={false}>
        {transfers.map((transfer) => {
          const from = byId(transfer.from);
          const to = byId(transfer.to);
          if (!from || !to) return null;

          return (
            <motion.div
              key={`${transfer.from}-${transfer.to}`}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex items-center gap-2">
                  <Avatar person={from} size="sm" />
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                  <Avatar person={to} size="sm" />
                </span>

                <p className="min-w-0 flex-1 text-body">
                  <span className="font-medium">{from.name}</span> owes{' '}
                  <span className="font-medium">{to.name}</span>{' '}
                  <span className="font-semibold tabular text-negative">
                    {formatAbsCurrency(transfer.amount, currency)}
                  </span>
                </p>

                <Button asChild variant="secondary" size="sm">
                  <Link
                    to={`/settle-up?from=${transfer.from}&to=${transfer.to}&amount=${transfer.amount}`}
                  >
                    Settle
                  </Link>
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Card>
  );
}
