import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useGroupStore } from '@/store/useGroupStore';
import { GroupSwitcher } from './GroupSwitcher';
import { AccountMenu } from './AccountMenu';
import { getCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/home': 'Home',
  '/expenses': 'Expenses',
  '/people': 'People',
  '/settle-up': 'Settle up',
  '/recurring': 'Recurring',
  '/settings': 'Settings',
  '/add-expense': 'Add expense',
};

/** Routes that are a detail/sub view and deserve a back affordance. */
function isSubRoute(pathname: string) {
  return (
    /^\/(people|expenses)\/[^/]+$/.test(pathname) ||
    /^\/add-expense\/[^/]+$/.test(pathname) ||
    pathname === '/add-expense' ||
    pathname === '/settle-up' ||
    pathname === '/recurring'
  );
}

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const group = useGroupStore((s) => s.group);
  const currency = getCurrency(group?.currency ?? 'USD');

  const title = TITLES[location.pathname] ?? contextualTitle(location.pathname);
  const showBack = isSubRoute(location.pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150',
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4 md:h-16 md:px-8">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="-ml-2.5 flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:bg-muted"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </button>
        )}

        <h1 className="min-w-0 flex-1 truncate text-section font-semibold md:text-page">{title}</h1>

        {/* The sidebar carries the switcher and account from md up; below
            that they live here. Detail screens drop the switcher so the title
            gets the room, and switching mid-edit would discard the screen. */}
        <div className="flex items-center gap-1.5 md:hidden">
          {!showBack && <GroupSwitcher variant="compact" />}
          <AccountMenu />
        </div>

        <Badge variant="outline" className="hidden shrink-0 md:inline-flex">
          {currency.symbol} {currency.code}
        </Badge>
      </div>
    </header>
  );
}

function contextualTitle(pathname: string): string {
  if (pathname.startsWith('/people/')) return 'Person';
  if (pathname.startsWith('/expenses/')) return 'Details';
  if (pathname.startsWith('/add-expense/')) return 'Edit expense';
  return 'JustSplit';
}
