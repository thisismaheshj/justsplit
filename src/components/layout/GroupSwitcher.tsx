import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, LayoutGrid, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGroupStore } from '@/store/useGroupStore';
import { getCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

/**
 * Switching group reloads the whole ledger from Postgres, so it always lands
 * on Home rather than leaving you on a detail route pointing at a row that
 * belongs to the group you just left.
 */
export function GroupSwitcher({ variant = 'sidebar' }: { variant?: 'sidebar' | 'compact' }) {
  const navigate = useNavigate();
  const group = useGroupStore((s) => s.group);
  const groups = useGroupStore((s) => s.groups);
  const groupId = useGroupStore((s) => s.groupId);
  const loading = useGroupStore((s) => s.loading);
  const selectGroup = useGroupStore((s) => s.selectGroup);

  const currency = getCurrency(group?.currency ?? 'USD');

  async function switchTo(id: string) {
    if (id === groupId) return;
    await selectGroup(id);
    const next = useGroupStore.getState().group;
    if (next) toast.success(`Switched to ${next.name}`);
    navigate('/home');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch group"
        disabled={loading}
        className={cn(
          'flex items-center gap-3 rounded-lg text-left transition-colors',
          variant === 'sidebar'
            ? 'w-full px-2 py-1.5 hover:bg-muted'
            : 'min-h-11 max-w-[60vw] px-2 py-1 hover:bg-muted',
        )}
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          aria-hidden
        >
          <Wallet className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label font-semibold leading-tight">
            {group?.name ?? 'JustSplit'}
          </span>
          <span className="block text-caption text-muted-foreground">
            {currency.code} · {currency.symbol}
            {groups.length > 1 && ` · ${groups.length} groups`}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
          <LayoutGrid aria-hidden />
          All groups overview
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {groups.map((g) => {
          const active = g.id === groupId;
          return (
            <DropdownMenuItem
              key={g.id}
              onSelect={() => void switchTo(g.id)}
              className="justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{g.name}</span>
                <span className="block text-caption text-muted-foreground">
                  {getCurrency(g.currency).symbol} {g.currency}
                </span>
              </span>
              {active && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
              {active && <span className="sr-only">(current group)</span>}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => navigate('/groups/new')}>
          <Plus aria-hidden />
          New group or trip
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
