import { resolveIcon } from '@/components/ui/category-icon';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

/** Horizontally scrolling chips on mobile, wrapping grid from sm upwards. */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Category"
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible"
    >
      {categories.map((category) => {
        const Icon = resolveIcon(category.icon);
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-body font-medium transition-colors',
              selected
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
