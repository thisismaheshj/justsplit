export interface CurrencyMeta {
  code: string;
  symbol: string;
  label: string;
  decimalDigits: number;
  locale: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', decimalDigits: 2, locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: 'US Dollar', decimalDigits: 2, locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro', decimalDigits: 2, locale: 'de-DE' },
  { code: 'GBP', symbol: '£', label: 'British Pound', decimalDigits: 2, locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', decimalDigits: 0, locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', decimalDigits: 2, locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', decimalDigits: 2, locale: 'en-CA' },
];

const FALLBACK: CurrencyMeta = {
  code: 'USD',
  symbol: '$',
  label: 'US Dollar',
  decimalDigits: 2,
  locale: 'en-US',
};

export function getCurrency(code: string): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? { ...FALLBACK, code, symbol: code };
}

export function currencySymbol(code: string): string {
  return getCurrency(code).symbol;
}

export function decimalDigits(code: string): number {
  return getCurrency(code).decimalDigits;
}

function factor(code: string): number {
  return Math.pow(10, decimalDigits(code));
}

/** "1250.50" (major units) -> 125050 (minor units). Rounds to nearest minor unit. */
export function toMinorUnits(value: number | string, code: string): number {
  const num = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : value;
  if (!Number.isFinite(num)) return NaN;
  // toPrecision(15) strips binary-float artefacts (1.005 * 100 === 100.49999999999999)
  // before rounding, so decimal input rounds the way a human expects.
  return Math.round(Number((num * factor(code)).toPrecision(15)));
}

/** 125050 (minor units) -> 1250.5 (major units). */
export function fromMinorUnits(minor: number, code: string): number {
  return minor / factor(code);
}

/** Full localized currency string, e.g. "₹1,250.50". */
export function formatCurrency(minor: number, code: string): string {
  const meta = getCurrency(code);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: meta.decimalDigits,
      maximumFractionDigits: meta.decimalDigits,
    }).format(fromMinorUnits(minor, code));
  } catch {
    return `${meta.symbol}${fromMinorUnits(minor, code).toFixed(meta.decimalDigits)}`;
  }
}

/** Absolute value formatted — for use alongside an explicit +/- sign or label. */
export function formatAbsCurrency(minor: number, code: string): string {
  return formatCurrency(Math.abs(minor), code);
}

/** Plain decimal string suitable for a controlled number input (no symbol). */
export function toInputString(minor: number, code: string): string {
  return fromMinorUnits(minor, code).toFixed(decimalDigits(code));
}

/** Signed string with an explicit + / - prefix. */
export function formatSignedCurrency(minor: number, code: string): string {
  if (minor === 0) return formatCurrency(0, code);
  return `${minor > 0 ? '+' : '-'}${formatAbsCurrency(minor, code)}`;
}
