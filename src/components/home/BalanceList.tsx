import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { BalanceAmount, BalancePhrase } from '@/components/ui/balance-amount';
import type { BalanceMap, Person } from '@/types';

/** Every person's standing, sorted creditors first. */
export function BalanceList({
  people,
  balances,
  currency,
}: {
  people: Person[];
  balances: BalanceMap;
  currency: string;
}) {
  const sorted = [...people].sort(
    (a, b) => (balances[b.id] ?? 0) - (balances[a.id] ?? 0),
  );

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {sorted.map((person, index) => {
        const balance = balances[person.id] ?? 0;
        return (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.15) }}
          >
            <Link
              to={`/people/${person.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
            >
              <Avatar person={person} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label font-medium">{person.name}</span>
                <BalancePhrase balance={balance} currency={currency} />
              </span>
              <span className="shrink-0 whitespace-nowrap">
                <BalanceAmount balance={balance} currency={currency} />
              </span>
            </Link>
          </motion.div>
        );
      })}
    </Card>
  );
}
