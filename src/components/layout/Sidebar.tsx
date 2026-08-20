import { NavLink, Link } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGroupStore } from '@/store/useGroupStore';
import { getCurrency } from '@/lib/currency';

export function Sidebar() {
  const group = useGroupStore((s) => s.group);
  const currency = getCurrency(group?.currency ?? 'USD');

  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-border bg-card px-4 py-6 md:flex"
    >
      <Link to="/home" className="flex items-center gap-3 rounded-lg px-2 py-1">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wallet className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-label font-semibold leading-tight">
            {group?.name ?? 'JustSplit'}
          </span>
          <span className="block text-caption text-muted-foreground">
            {currency.code} · {currency.symbol}
          </span>
        </span>
      </Link>

      <Button asChild size="md" className="w-full">
        <Link to="/add-expense">
          <Plus className="size-4" aria-hidden />
          Add Expense
        </Link>
      </Button>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-body font-medium transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                  {isActive && <span className="sr-only">(current page)</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <p className="mt-auto px-3 text-caption text-muted-foreground">
        Everything is stored on this device only.
      </p>
    </nav>
  );
}
