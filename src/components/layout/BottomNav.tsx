import { Link, NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { MOBILE_NAV_ITEMS } from './nav-items';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { pathname } = useLocation();
  // The floating action would only duplicate the screen you are already on,
  // and it would sit on top of that screen's own sticky save bar.
  const hideFab = pathname.startsWith('/add-expense') || pathname.startsWith('/settle-up');

  return (
    <>
      {!hideFab && (
      <Link
        to="/add-expense"
        aria-label="Add expense"
        className={cn(
          'fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full md:hidden',
          'bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95',
        )}
      >
        <Plus className="size-6" aria-hidden />
      </Link>
      )}

      <nav
        aria-label="Main"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
      >
        <ul className="flex items-stretch">
          {MOBILE_NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-caption font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primary-soft',
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                    </span>
                    {item.label}
                    {isActive && <span className="sr-only">(current page)</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
