import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Archive, Plus, UserPlus } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BalanceAmount } from '@/components/ui/balance-amount';
import { SectionHeader } from '@/components/ui/section-header';
import { PersonFormDialog } from './PersonFormDialog';

import { useGroupStore } from '@/store/useGroupStore';
import { useBalances } from '@/hooks/usePersonBalance';
import { describeBalance } from '@/store/selectors';

export function PeopleList() {
  const people = useGroupStore((s) => s.people);
  const currency = useGroupStore((s) => s.group?.currency ?? 'USD');
  const balances = useBalances();
  const [dialogOpen, setDialogOpen] = useState(false);

  const active = people.filter((p) => !p.archived);
  const archived = people.filter((p) => p.archived);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={`${active.length} ${active.length === 1 ? 'person' : 'people'}`}
        description="Tap someone to see everything they are part of."
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden />
            Add Person
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((person, index) => (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.18) }}
          >
            <Card className="h-full transition-colors hover:bg-muted">
              <Link
                to={`/people/${person.id}`}
                className="flex h-full items-center gap-3 p-4"
              >
                <Avatar person={person} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-semibold">{person.name}</span>
                  <span className="block text-caption text-muted-foreground">
                    {describeBalance(balances[person.id] ?? 0, currency)}
                  </span>
                  <span className="mt-1 block">
                    <BalanceAmount
                      balance={balances[person.id] ?? 0}
                      currency={currency}
                      size="sm"
                    />
                  </span>
                </span>
              </Link>
            </Card>
          </motion.div>
        ))}
      </div>

      {active.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <UserPlus className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-section font-semibold">No one here yet</p>
          <Button onClick={() => setDialogOpen(true)}>Add the first person</Button>
        </Card>
      )}

      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Removed"
            description="Kept for the record — they no longer appear when adding expenses."
          />
          <Card className="divide-y divide-border overflow-hidden">
            {archived.map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
              >
                <Avatar person={person} size="sm" className="opacity-60" />
                <span className="min-w-0 flex-1 truncate text-body font-medium text-muted-foreground">
                  {person.name}
                </span>
                <Badge variant="outline">
                  <Archive aria-hidden />
                  Removed
                </Badge>
                <BalanceAmount
                  balance={balances[person.id] ?? 0}
                  currency={currency}
                  size="sm"
                />
              </Link>
            ))}
          </Card>
        </section>
      )}

      <PersonFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
