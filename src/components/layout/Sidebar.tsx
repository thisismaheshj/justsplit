import { NavLink, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GroupSwitcher } from './GroupSwitcher';
import { AccountMenu } from './AccountMenu';

export function Sidebar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-border bg-card px-4 py-6 md:flex"
    >
      <GroupSwitcher />

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

      <div className="mt-auto border-t border-border pt-4">
        <AccountMenu variant="sidebar" />
      </div>
    </nav>
  );
}
