import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { MOBILE_NAV_ITEMS, type NavItem } from './nav-items';
import { cn } from '@/lib/utils';

/**
 * Four tabs with "Add expense" in the middle. Sitting in the bar rather than
 * floating over the page, it never covers the last row of a list or a sticky
 * save button, and it is where a thumb already rests.
 */
export function BottomNav() {
  const half = Math.ceil(MOBILE_NAV_ITEMS.length / 2);
  const left = MOBILE_NAV_ITEMS.slice(0, half);
  const right = MOBILE_NAV_ITEMS.slice(half);

  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/85 backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="flex h-16 items-stretch">
        {left.map((item) => (
          <Tab key={item.to} item={item} />
        ))}

        <li className="flex flex-1 items-center justify-center">
          <NavLink
            to="/add-expense"
            end
            aria-label="Add expense"
            className={({ isActive }) =>
              cn(
                'flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25',
                'transition-transform active:scale-95',
                isActive && 'ring-4 ring-primary-soft',
              )
            }
          >
            <Plus className="size-6" strokeWidth={2.25} aria-hidden />
          </NavLink>
        </li>

        {right.map((item) => (
          <Tab key={item.to} item={item} />
        ))}
      </ul>
    </nav>
  );
}

function Tab({ item }: { item: NavItem }) {
  return (
    <li className="flex-1">
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(
            'flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
          )
        }
      >
        {({ isActive }) => (
          <>
            <item.icon className="size-[22px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
            {item.label}
            {isActive && <span className="sr-only">(current page)</span>}
          </>
        )}
      </NavLink>
    </li>
  );
}
