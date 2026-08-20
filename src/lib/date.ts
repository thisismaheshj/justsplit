import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  isValid,
  lastDayOfMonth,
  parse,
} from 'date-fns';

/**
 * Timezone-safe helpers. Date-only values are always handled as plain
 * "YYYY-MM-DD" strings parsed in LOCAL time — never `new Date(str)`, which
 * parses bare date strings as UTC and shifts the day for negative offsets.
 */

export const DATE_FORMAT = 'yyyy-MM-dd';

/** Parse a "YYYY-MM-DD" string into a local-midnight Date. */
export function parseLocalDate(dateStr: string): Date {
  const parsed = parse(dateStr, DATE_FORMAT, new Date());
  if (!isValid(parsed)) throw new Error(`Invalid date string: ${dateStr}`);
  return parsed;
}

/** Format a Date as a local "YYYY-MM-DD" string. */
export function toDateString(date: Date): string {
  return format(date, DATE_FORMAT);
}

/** Today as a local "YYYY-MM-DD" string. */
export function todayString(): string {
  return toDateString(new Date());
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return isValid(parsed) && toDateString(parsed) === value;
}

/** Compare two date strings: negative if a < b, 0 if equal, positive if a > b. */
export function compareDateStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addDaysStr(dateStr: string, days: number): string {
  return toDateString(addDays(parseLocalDate(dateStr), days));
}

export function addWeeksStr(dateStr: string, weeks: number): string {
  return toDateString(addWeeks(parseLocalDate(dateStr), weeks));
}

/**
 * Add months, clamping the day-of-month to the last valid day of the target
 * month (Jan 31 + 1 month -> Feb 28/29). `anchorDay` lets a series remember its
 * original day-of-month so Jan 31 -> Feb 28 -> Mar 31 rather than sticking at 28.
 */
export function addMonthsClamped(dateStr: string, months: number, anchorDay?: number): string {
  const base = parseLocalDate(dateStr);
  const day = anchorDay ?? base.getDate();
  const shifted = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), months);
  const lastDay = lastDayOfMonth(shifted).getDate();
  const target = new Date(shifted.getFullYear(), shifted.getMonth(), Math.min(day, lastDay));
  return toDateString(target);
}

/** "Today" / "Yesterday" / "Tue, 12 Aug" style day header. */
export function formatDayHeader(dateStr: string, today = todayString()): string {
  const diff = differenceInCalendarDays(parseLocalDate(today), parseLocalDate(dateStr));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  const d = parseLocalDate(dateStr);
  const sameYear = d.getFullYear() === parseLocalDate(today).getFullYear();
  return format(d, sameYear ? 'EEE, d MMM' : 'EEE, d MMM yyyy');
}

/** Compact relative label used in list rows. */
export function formatRelativeDay(dateStr: string, today = todayString()): string {
  const diff = differenceInCalendarDays(parseLocalDate(today), parseLocalDate(dateStr));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  if (diff < -1 && diff > -7) return `in ${Math.abs(diff)} days`;
  return format(parseLocalDate(dateStr), 'd MMM');
}

export function formatLongDate(dateStr: string): string {
  return format(parseLocalDate(dateStr), 'EEEE, d MMMM yyyy');
}

export function formatMediumDate(dateStr: string): string {
  return format(parseLocalDate(dateStr), 'd MMM yyyy');
}
