import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { ExpenseListItem } from '@/components/expenses/ExpenseListItem';
import type { Category, Person, Transaction } from '@/types';

export function RecentExpenses({
  transactions,
  people,
  categories,
  currency,
}: {
  transactions: Transaction[];
  people: Person[];
  categories: Category[];
  currency: string;
}) {
  return (
    <Card className="divide-y divide-border overflow-hidden">
      <AnimatePresence initial={false}>
        {transactions.map((transaction) => (
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
              people={people}
              categories={categories}
              currency={currency}
              showDate
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <Link
        to="/expenses"
        className="flex min-h-11 items-center justify-center px-4 py-3 text-body font-medium text-primary transition-colors hover:bg-muted"
      >
        View all
      </Link>
    </Card>
  );
}
