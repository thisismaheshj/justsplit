import type { ValidationResult, FieldErrors } from '@/lib/validation';

/* --------------------------------------------------------------- email --- */

// Deliberately loose: the only authority on whether an address works is
// whether mail reaches it. This catches typos, not exotic-but-legal addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/* ------------------------------------------------------------ password --- */

export interface PasswordStrength {
  /** 0-4. Below 2 is rejected. */
  score: number;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  /** The single most useful next improvement, or null when strong. */
  hint: string | null;
  valid: boolean;
}

export const PASSWORD_MIN_LENGTH = 8;

const COMMON = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty123', 'letmein1',
  'iloveyou', 'admin123', 'welcome1', 'abc12345', 'password123', 'qwertyuiop',
]);

/**
 * Scored on length and variety rather than a checklist of mandatory symbol
 * classes — long passphrases beat short cryptic ones, and rules that force
 * "P@ssw0rd!" make passwords worse, not better.
 */
export function scorePassword(password: string): PasswordStrength {
  const pw = password;

  if (!pw) {
    return { score: 0, label: 'Too weak', hint: 'Enter a password', valid: false };
  }
  if (COMMON.has(pw.toLowerCase())) {
    return { score: 0, label: 'Too weak', hint: 'That is one of the most guessed passwords', valid: false };
  }
  if (pw.length < PASSWORD_MIN_LENGTH) {
    return {
      score: 0,
      label: 'Too weak',
      hint: `Use at least ${PASSWORD_MIN_LENGTH} characters`,
      valid: false,
    };
  }

  let score = 1;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;

  const classes =
    Number(/[a-z]/.test(pw)) + Number(/[A-Z]/.test(pw)) + Number(/\d/.test(pw)) + Number(/[^\w\s]/.test(pw));
  if (classes >= 2) score++;
  if (classes >= 3 && pw.length >= 12) score++;

  // A single repeated character or a straight run is not variety.
  if (/^(.)\1+$/.test(pw) || /^(?:0123456789|abcdefghijklmnopqrstuvwxyz).*/i.test(pw)) score = 1;

  score = Math.min(4, score);

  const labels: PasswordStrength['label'][] = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const hint =
    score >= 4 ? null
    : pw.length < 12 ? 'Longer is stronger — try a memorable phrase'
    : classes < 3 ? 'Mix in numbers or punctuation'
    : 'Add a few more characters';

  return { score, label: labels[score], hint, valid: score >= 2 };
}

/* --------------------------------------------------------------- forms --- */

export type SignUpField = 'name' | 'email' | 'password' | 'confirmPassword';

export function validateSignUp(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult<SignUpField> {
  const errors: FieldErrors<SignUpField> = {};

  if (!input.name.trim()) errors.name = 'Name is required';
  else if (input.name.trim().length > 40) errors.name = 'Name must be 40 characters or fewer';

  if (!input.email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(input.email)) errors.email = 'That does not look like an email address';

  const strength = scorePassword(input.password);
  if (!input.password) errors.password = 'Password is required';
  else if (!strength.valid) errors.password = strength.hint ?? 'Choose a stronger password';

  if (!input.confirmPassword) errors.confirmPassword = 'Confirm your password';
  else if (input.confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match';

  return { valid: Object.keys(errors).length === 0, errors };
}

export type SignInField = 'email' | 'password';

export function validateSignIn(input: { email: string; password: string }): ValidationResult<SignInField> {
  const errors: FieldErrors<SignInField> = {};
  if (!input.email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(input.email)) errors.email = 'That does not look like an email address';
  if (!input.password) errors.password = 'Password is required';
  return { valid: Object.keys(errors).length === 0, errors };
}
