import {
  Bed,
  Beer,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  Home,
  MoreHorizontal,
  Music,
  PawPrint,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Tag,
  Ticket,
  Utensils,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Every lucide icon a category is allowed to use, keyed by its name. */
export const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  ShoppingCart,
  Car,
  Home,
  Bed,
  Film,
  ShoppingBag,
  Receipt,
  MoreHorizontal,
  Tag,
  Gift,
  Plane,
  Coffee,
  Dumbbell,
  Stethoscope,
  GraduationCap,
  PawPrint,
  Wrench,
  Music,
  Beer,
  Ticket,
};

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MoreHorizontal;
}

export function CategoryIcon({
  icon,
  className,
  size = 'md',
}: {
  icon: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Icon = resolveIcon(icon);
  const box = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10';
  const glyph = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground',
        box,
        className,
      )}
      aria-hidden
    >
      <Icon className={glyph} />
    </span>
  );
}
