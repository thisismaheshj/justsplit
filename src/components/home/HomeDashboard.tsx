import { Link } from 'react-router-dom';
import { HandCoins, Plus, Receipt, Users } from 'lucide-react';

import { SummaryCards } from './SummaryCards';
import { BalanceList } from './BalanceList';
import { WhoOwesWho } from './WhoOwesWho';
import { RecentExpenses } from './RecentExpenses';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';

import { useGroupStore } from '@/store/useGroupStore';
import {
  selectActivePeople,
  selectRecentTransactions,
  selectSimplifiedDebts,
  selectTotalSpend,
  selectOutstandingTotal,
} from '@/store/selectors';
import { useBalances } from '@/hooks/usePersonBalance';

export function HomeDashboard() {
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';

  const balances = useBalances();
  const activePeople = selectActivePeople(store);
  const transfers = selectSimplifiedDebts(store);
  const recent = selectRecentTransactions(store, 5);
  const total = selectTotalSpend(store);
  const outstanding = selectOutstandingTotal(store);

  const hasExpenses = store.expenses.length > 0 || store.settlements.length > 0;
  const singlePerson = activePeople.length <= 1;

  return (
    <div className="flex flex-col gap-8">
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
        <div>
          <h2 className="text-page font-semibold">{store.group?.name}</h2>
          <p className="text-body text-muted-foreground">
            {activePeople.length} {activePeople.length === 1 ? 'person' : 'people'} sharing expenses
          </p>
        </div>
        <Button asChild>
          <Link to="/add-expense">
            <Plus aria-hidden />
            Add Expense
          </Link>
        </Button>
      </div>

      <SummaryCards
        totalSpend={total}
        outstanding={outstanding}
        expenseCount={store.expenses.length}
        currency={currency}
      />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Balances"
          action={
            !singlePerson && (
              <Button asChild variant="secondary" size="sm">
                <Link to="/settle-up">
                  <HandCoins aria-hidden />
                  Settle Up
                </Link>
              </Button>
            )
          }
        />
        {activePeople.length > 0 ? (
          <BalanceList people={activePeople} balances={balances} currency={currency} />
        ) : (
          <EmptyState
            icon={<Users />}
            title="No one in this group yet"
            description="Add the people you are splitting expenses with."
            action={
              <Button asChild>
                <Link to="/people">Add people</Link>
              </Button>
            }
          />
        )}
      </section>

      {!singlePerson ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Who owes who" />
          <WhoOwesWho transfers={transfers} people={store.people} currency={currency} />
        </section>
      ) : (
        <Card className="px-4 py-5 text-body text-muted-foreground">
          It's just you in this group for now, so there is nothing to settle. Add someone from the
          People tab to start splitting.
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Recent activity" />
        {hasExpenses ? (
          <RecentExpenses
            transactions={recent}
            people={store.people}
            categories={store.categories}
            currency={currency}
          />
        ) : (
          <EmptyState
            icon={<Receipt />}
            title="No expenses yet"
            description="Record what someone paid for and JustSplit works out who owes what."
            action={
              <Button asChild>
                <Link to="/add-expense">
                  <Plus aria-hidden />
                  Add your first expense
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <Button asChild size="lg" className="md:hidden">
        <Link to="/add-expense">
          <Plus aria-hidden />
          Add Expense
        </Link>
      </Button>
    </div>
  );
}
