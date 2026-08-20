import type { Category, CategoryId } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', icon: 'Utensils' },
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart' },
  { id: 'transport', label: 'Transport', icon: 'Car' },
  { id: 'rent', label: 'Rent', icon: 'Home' },
  { id: 'hotel', label: 'Hotel', icon: 'Bed' },
  { id: 'entertainment', label: 'Entertainment', icon: 'Film' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag' },
  { id: 'bills', label: 'Bills', icon: 'Receipt' },
  { id: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

export const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map((c) => c.id);

export function isDefaultCategory(id: CategoryId): boolean {
  return DEFAULT_CATEGORY_IDS.includes(id);
}

/** Icons offered when creating a custom category. */
export const CUSTOM_CATEGORY_ICONS = [
  'Tag',
  'Gift',
  'Plane',
  'Coffee',
  'Dumbbell',
  'Stethoscope',
  'GraduationCap',
  'PawPrint',
  'Wrench',
  'Music',
  'Beer',
  'Ticket',
] as const;

export function findCategory(categories: Category[], id: CategoryId): Category {
  return (
    categories.find((c) => c.id === id) ?? {
      id,
      label: 'Other',
      icon: 'MoreHorizontal',
    }
  );
}

/** Slugify a custom label into a stable id, deduped against existing ids. */
export function categoryIdFromLabel(label: string, existingIds: string[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'category';
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
