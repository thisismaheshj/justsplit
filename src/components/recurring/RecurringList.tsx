import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { RecurringFormDialog } from './RecurringFormDialog';

import { useGroupStore } from '@/store/useGroupStore';
import { findCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/currency';
import { formatMediumDate } from '@/lib/date';
import { frequencyLabel, instancesOf } from '@/lib/recurring';
import type { RecurringExpense } from '@/types';

const SPLIT_LABEL: Record<string, string> = {
  equal: 'split equally',
  exact: 'exact amounts',
  percentage: 'by percentage',
  shares: 'by shares',
};

export function RecurringList() {
  const store = useGroupStore();
  const currency = store.group?.currency ?? 'USD';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | undefined>();
  const [deleting, setDeleting] = useState<RecurringExpense | undefined>();

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (template: RecurringExpense) => {
    setEditing(template);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Repeating expenses"
        description="Added to your history automatically when each one falls due."
        action={
          <Button size="sm" onClick={openNew}>
            <Plus aria-hidden />
            Add
          </Button>
        }
      />

      {store.recurringExpenses.length === 0 ? (
        <EmptyState
          icon={<Repeat />}
          title="No repeating expenses"
          description="Set up rent, subscriptions or anything else that comes back every week or month."
          action={<Button onClick={openNew}>Create one</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {store.recurringExpenses.map((template) => {
              const category = findCategory(store.categories, template.category);
              const payer = store.people.find((p) => p.id === template.paidBy);
              const generated = instancesOf(store.expenses, template.id).length;

              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <CategoryIcon icon={category.icon} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-label font-semibold">
                            {template.description}
                          </h3>
                          <Badge variant={template.active ? 'positive' : 'neutral'}>
                            {template.active ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge variant="outline">{frequencyLabel(template.frequency)}</Badge>
                        </div>

                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                          {payer && <Avatar person={payer} size="xs" />}
                          <span>
                            {payer?.name ?? 'Someone'} pays ·{' '}
                            {template.participants.length}{' '}
                            {template.participants.length === 1 ? 'person' : 'people'},{' '}
                            {SPLIT_LABEL[template.splitMethod]}
                          </span>
                        </p>

                        <p className="mt-1.5 flex items-center gap-1.5 text-caption text-muted-foreground">
                          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                          {template.active
                            ? `Next on ${formatMediumDate(template.nextDueDate)}`
                            : 'Paused — nothing will be generated'}
                          {template.endDate && ` · ends ${formatMediumDate(template.endDate)}`}
                          {generated > 0 && ` · ${generated} recorded so far`}
                        </p>
                      </div>

                      <p className="shrink-0 text-label font-semibold tabular">
                        {formatCurrency(template.amount, currency)}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          store.toggleRecurringActive(template.id, !template.active);
                          toast.success(
                            template.active
                              ? `${template.description} paused`
                              : `${template.description} resumed`,
                          );
                        }}
                      >
                        {template.active ? <Pause aria-hidden /> : <Play aria-hidden />}
                        {template.active ? 'Pause' : 'Resume'}
                      </Button>

                      <Button variant="secondary" size="sm" onClick={() => openEdit(template)}>
                        <Pencil aria-hidden />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-negative"
                        onClick={() => setDeleting(template)}
                      >
                        <Trash2 aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <RecurringFormDialog open={formOpen} onOpenChange={setFormOpen} template={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete "${deleting?.description}"?`}
        description="No further occurrences will be created. Expenses already generated from it stay in your history. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          store.deleteRecurringExpense(deleting.id);
          toast.success('Repeating expense deleted');
          setDeleting(undefined);
        }}
      />
    </div>
  );
}
