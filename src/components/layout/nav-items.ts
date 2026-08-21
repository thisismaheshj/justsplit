import {
  LayoutGrid,
  Home,
  Receipt,
  Users,
  HandCoins,
  Repeat,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Full destination list for the desktop sidebar. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { to: '/home', label: 'Home', icon: Home },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/people', label: 'People', icon: Users },
  { to: '/settle-up', label: 'Settle Up', icon: HandCoins },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Mobile keeps four tabs. Overview is not one of them: the group switcher sits
 * in the top bar and is the natural home for "which scope am I in", so it
 * carries the all-groups link rather than crowding the bar to five.
 */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((item) =>
  ['/home', '/expenses', '/people', '/settings'].includes(item.to),
);
