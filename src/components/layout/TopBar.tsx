import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGroupStore } from '@/store/useGroupStore';
import { getCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TITLES: Record<string, string> = {
  '/home': 'Home',
  '/expenses': 'Expenses',
  '/people': 'People',
  '/settle-up': 'Settle Up',
  '/recurring': 'Recurring',
  '/settings': 'Settings',
  '/add-expense': 'Add Expense',
};

/** Routes that are a detail/sub view and deserve a back affordance. */
function isSubRoute(pathname: string) {
  return (
    /^\/(people|expenses)\/[^/]+$/.test(pathname) ||
    /^\/add-expense\/[^/]+$/.test(pathname) ||
    pathname === '/add-expense' ||
    pathname === '/settle-up'
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
        'sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur',
        'flex items-center gap-3 px-4 py-3 md:px-8 md:py-4',
      )}
    >
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-section font-semibold md:text-page">{title}</h1>
        <p className="truncate text-caption text-muted-foreground md:hidden">
          {group?.name}
        </p>
      </div>

      <Badge variant="outline" className="shrink-0">
        {currency.symbol} {currency.code}
      </Badge>
    </header>
  );
}

function contextualTitle(pathname: string): string {
  if (pathname.startsWith('/people/')) return 'Person';
  if (pathname.startsWith('/expenses/')) return 'Details';
  if (pathname.startsWith('/add-expense/')) return 'Edit Expense';
  return 'JustSplit';
}
