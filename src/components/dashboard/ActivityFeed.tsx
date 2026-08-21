import { Link } from 'react-router-dom';
import { ArrowRight, HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/category-icon';
import { findCategory } from '@/lib/categories';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { formatCurrency } from '@/lib/currency';
import { formatRelativeDay } from '@/lib/date';
import type { ActivityEntry } from '@/lib/dashboardApi';

/** Newest first across every group, so the group name earns its place on each row. */
export function ActivityFeed({
  entries,
  onOpenGroup,
}: {
  entries: ActivityEntry[];
  onOpenGroup: (groupId: string) => void;
}) {
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {entries.map((entry) => {
        const isSettlement = entry.kind === 'settlement';
        // Custom categories live per group; the feed only needs the defaults,
        // and anything unknown falls back to a neutral icon.
        const category = findCategory(DEFAULT_CATEGORIES, entry.category ?? 'other');

        return (
          <Link
            key={entry.id}
            to="/home"
            onClick={(event) => {
              event.preventDefault();
              onOpenGroup(entry.groupId);
            }}
            className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
          >
            {isSettlement ? (
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-positive-soft text-positive"
                aria-hidden
              >
                <HandCoins className="size-5" />
              </span>
            ) : (
              <CategoryIcon icon={category.icon} />
            )}

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-label font-medium">
                  {isSettlement
                    ? `${entry.actorName} paid ${entry.otherName}`
                    : entry.description}
                </span>
                {isSettlement && <Badge variant="positive">Settlement</Badge>}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
                <span className="truncate font-medium">{entry.groupName}</span>
                <span aria-hidden>·</span>
                {!isSettlement && (
                  <>
                    <span className="truncate">{entry.actorName} paid</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <span>{formatRelativeDay(entry.date)}</span>
              </span>
            </span>

            <span className="shrink-0 text-label font-semibold tabular">
              {formatCurrency(entry.amount, entry.currency)}
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        );
      })}
    </Card>
  );
}
