import {
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

/** Full destination list — the desktop sidebar shows all six. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/people', label: 'People', icon: Users },
  { to: '/settle-up', label: 'Settle Up', icon: HandCoins },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Mobile keeps four tabs; Settle Up and Recurring live one tap deeper. */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((item) =>
  ['/home', '/expenses', '/people', '/settings'].includes(item.to),
);
