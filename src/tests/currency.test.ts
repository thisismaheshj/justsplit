import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  decimalDigits,
  formatCurrency,
  formatSignedCurrency,
  fromMinorUnits,
  getCurrency,
  toInputString,
  toMinorUnits,
} from '@/lib/currency';

describe('toMinorUnits / fromMinorUnits', () => {
  it('converts two-decimal currencies', () => {
    expect(toMinorUnits('1250.50', 'INR')).toBe(125_050);
    expect(toMinorUnits(0.01, 'USD')).toBe(1);
    expect(toMinorUnits('0', 'USD')).toBe(0);
  });

  it('treats zero-decimal currencies as whole units', () => {
    expect(toMinorUnits('1250', 'JPY')).toBe(1250);
    expect(fromMinorUnits(1250, 'JPY')).toBe(1250);
  });

  it('rounds half-up the way a person expects, despite binary floats', () => {
    expect(toMinorUnits(1.005, 'USD')).toBe(101);
    expect(toMinorUnits('2.675', 'USD')).toBe(268);
  });

  it('strips thousands separators and whitespace', () => {
    expect(toMinorUnits(' 1,250.50 ', 'INR')).toBe(125_050);
  });

  it('returns NaN for unparseable input', () => {
    expect(Number.isNaN(toMinorUnits('abc', 'USD'))).toBe(true);
  });

  it('round-trips every seeded currency', () => {
    for (const currency of CURRENCIES) {
      for (const major of [0, 1, 7.5, 1234.56, 99_999]) {
        const rounded = Number(major.toFixed(currency.decimalDigits));
        const minor = toMinorUnits(rounded, currency.code);
        expect(Number.isInteger(minor)).toBe(true);
        expect(fromMinorUnits(minor, currency.code)).toBeCloseTo(rounded, 10);
      }
    }
  });

  it('produces an input string at the currency precision', () => {
    expect(toInputString(125_050, 'INR')).toBe('1250.50');
    expect(toInputString(1250, 'JPY')).toBe('1250');
  });
});

describe('formatCurrency', () => {
  it('respects each currency decimal precision', () => {
    expect(formatCurrency(125_050, 'INR')).toMatch(/1,250\.50/);
    expect(decimalDigits('JPY')).toBe(0);
    expect(formatCurrency(1250, 'JPY')).not.toMatch(/\./);
  });

  it('includes the currency symbol', () => {
    expect(formatCurrency(10_000, 'INR')).toContain('₹');
    expect(formatCurrency(10_000, 'USD')).toContain('$');
    expect(formatCurrency(10_000, 'GBP')).toContain('£');
  });

  it('prefixes an explicit sign when asked', () => {
    expect(formatSignedCurrency(50_000, 'INR').startsWith('+')).toBe(true);
    expect(formatSignedCurrency(-50_000, 'INR').startsWith('-')).toBe(true);
    expect(formatSignedCurrency(0, 'INR').startsWith('+')).toBe(false);
  });

  it('falls back gracefully for an unknown currency code', () => {
    const meta = getCurrency('XYZ');
    expect(meta.decimalDigits).toBe(2);
    expect(() => formatCurrency(100, 'XYZ')).not.toThrow();
  });
});
