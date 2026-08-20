import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveIcon } from '@/components/ui/category-icon';
import { cn } from '@/lib/utils';

import { useGroupStore } from '@/store/useGroupStore';
import { CUSTOM_CATEGORY_ICONS, isDefaultCategory } from '@/lib/categories';
import { validateCategoryLabel } from '@/lib/validation';
import type { Category } from '@/types';

export function CategoryManager() {
  const categories = useGroupStore((s) => s.categories);
  const expenses = useGroupStore((s) => s.expenses);
  const addCustomCategory = useGroupStore((s) => s.addCustomCategory);
  const removeCustomCategory = useGroupStore((s) => s.removeCustomCategory);

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string>(CUSTOM_CATEGORY_ICONS[0]);
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState<Category | undefined>();

  const usageCount = (id: string) => expenses.filter((e) => e.category === id).length;

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateCategoryLabel(
      label,
      categories.map((c) => c.label),
    );
    if (!validation.valid) {
      setError(validation.errors.label);
      return;
    }
    addCustomCategory(label, icon);
    toast.success(`"${label.trim()}" added`);
    setLabel('');
    setError(undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {categories.map((category) => {
            const Icon = resolveIcon(category.icon);
            const isDefault = isDefaultCategory(category.id);
            return (
              <motion.li
                key={category.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pl-3 pr-1.5"
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-body font-medium">{category.label}</span>
                {isDefault ? (
                  <Badge variant="outline">Default</Badge>
                ) : (
                  <button
                    type="button"
                    aria-label={`Remove ${category.label}`}
                    onClick={() => setDeleting(category)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <form onSubmit={add} className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <Field id="new-category" label="Add a category" error={error}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={label}
              maxLength={24}
              placeholder="e.g. Petrol"
              onChange={(event) => {
                setLabel(event.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <Label id="category-icon-label">Icon</Label>
          <div
            role="radiogroup"
            aria-labelledby="category-icon-label"
            className="flex flex-wrap gap-2"
          >
            {CUSTOM_CATEGORY_ICONS.map((name) => {
              const Icon = resolveIcon(name);
              const selected = name === icon;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-lg border transition-colors',
                    selected
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Button type="submit" variant="secondary" size="sm">
            <Plus aria-hidden />
            Add category
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Remove "${deleting?.label}"?`}
        destructive
        confirmLabel="Remove"
        description={
          deleting && usageCount(deleting.id) > 0
            ? `${usageCount(deleting.id)} expense${usageCount(deleting.id) === 1 ? '' : 's'} use this category. They will be moved to "Other". Amounts and balances are not affected.`
            : 'This category will no longer be available when adding expenses.'
        }
        onConfirm={() => {
          if (!deleting) return;
          removeCustomCategory(deleting.id);
          toast.success(`"${deleting.label}" removed`);
          setDeleting(undefined);
        }}
      />
    </div>
  );
}
