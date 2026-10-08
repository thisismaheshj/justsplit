import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to be told about the custom type scale.
 *
 * The scale uses names (text-body, text-label, ...) rather than Tailwind's
 * text-sm/text-base. Out of the box twMerge cannot tell whether `text-body` is
 * a font size or a text colour, assumes colour, and treats it as conflicting
 * with `text-primary-foreground`. cva emits size classes after variant classes,
 * so the size always won and every button silently lost its text colour and
 * inherited the page's charcoal instead -- white-on-crimson was rendering as
 * charcoal-on-crimson at 2.7:1, below AA.
 *
 * Declaring the scale here restores the distinction: sizes conflict only with
 * sizes, colours only with colours.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'body', 'label', 'section', 'page'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Supabase hands back plain `{ message, code }` objects, not Error instances,
 * so `String(error)` renders them as "[object Object]".
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? message : String(error);
}
