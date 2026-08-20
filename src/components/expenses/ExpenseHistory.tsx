import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Plus, Receipt, SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ExpenseFilters } from './ExpenseFilters';
import { ExpenseListItem } from './ExpenseListItem';

import { useGroupStore } from '@/store/useGroupStore';
import {
  filterTransactions,
  groupByDate,
  selectTransactions,
  type TransactionFilters,
} from '@/store/selectors';
import { formatDayHeader } from '@/lib/date';
import { formatCurrency } from '@/lib/currency';
import { isExpense } from '@/store/selectors';

export function ExpenseHistory() {
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';

  const [filters, setFilters] = useState<TransactionFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const all = useMemo(() => selectTransactions(store), [store]);
  const filtered = useMemo(() => filterTransactions(all, filters), [all, filters]);
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const filterCount = Object.values(filters).filter(Boolean).length;
  const hasAny = all.length > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon={<Receipt />}
        title="No history yet"
        description="Every expense and settlement you record shows up here, newest first."
        action={
          <Button asChild>
            <Link to="/add-expense">
              <Plus aria-hidden />
              Add an expense
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body text-muted-foreground">
          {filtered.length} of {all.length} entries
        </p>
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Filter aria-hidden />
          Filters
          {filterCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-caption text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ExpenseFilters
              filters={filters}
              onChange={setFilters}
              people={store.people}
              categories={store.categories}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Nothing matches those filters"
          description="Try widening the date range or clearing a filter."
          action={
            <Button variant="secondary" onClick={() => setFilters({})}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const dayTotal = group.items
              .filter(isExpense)
              .reduce((sum, item) => sum + item.amount, 0);

            return (
              <section key={group.date} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <h2 className="text-body font-semibold">{formatDayHeader(group.date)}</h2>
                  {dayTotal > 0 && (
                    <span className="text-caption tabular text-muted-foreground">
                      {formatCurrency(dayTotal, currency)}
                    </span>
                  )}
                </div>

                <Card className="divide-y divide-border overflow-hidden">
                  <AnimatePresence initial={false}>
                    {group.items.map((transaction) => (
                      <motion.div
                        key={transaction.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <ExpenseListItem
                          transaction={transaction}
                          people={store.people}
                          categories={store.categories}
                          currency={currency}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
