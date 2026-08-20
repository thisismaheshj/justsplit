import type { ParticipantInput, SplitMethod } from '@/types';
import { isValidDateString } from '@/lib/date';

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export interface ValidationResult<T extends string = string> {
  valid: boolean;
  errors: FieldErrors<T>;
}

function result<T extends string>(errors: FieldErrors<T>): ValidationResult<T> {
  return { valid: Object.keys(errors).length === 0, errors };
}

/* ------------------------------- Person -------------------------------- */

export type PersonField = 'name';

export function validatePerson(input: { name: string }): ValidationResult<PersonField> {
  const errors: FieldErrors<PersonField> = {};
  if (!input.name.trim()) errors.name = 'Name is required';
  else if (input.name.trim().length > 40) errors.name = 'Name must be 40 characters or fewer';
  return result(errors);
}

/* ---------------------------- Split validation -------------------------- */

export interface SplitValidation {
  valid: boolean;
  /** Signed difference in minor units (exact) — positive means still unassigned. */
  difference: number;
  /** Human message describing the current state. */
  message: string;
  /** Present when the split is unusable. */
  error?: string;
}

export function validateSplit(
  method: SplitMethod,
  amount: number,
  participants: ParticipantInput[],
): SplitValidation {
  if (participants.length === 0) {
    return { valid: false, difference: amount, message: '', error: 'Select at least one participant' };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { valid: false, difference: 0, message: '', error: 'Enter an amount greater than zero' };
  }

  switch (method) {
    case 'equal':
      return { valid: true, difference: 0, message: 'Split evenly' };

    case 'exact': {
      const values = participants.map((p) => p.inputValue ?? 0);
      if (values.some((v) => !Number.isFinite(v) || v < 0)) {
        return { valid: false, difference: 0, message: '', error: 'Amounts cannot be negative' };
      }
      const total = values.reduce((sum, v) => sum + Math.round(v), 0);
      const difference = amount - total;
      return {
        valid: difference === 0,
        difference,
        message: difference === 0 ? 'Split adds up' : '',
        error: difference === 0 ? undefined : difference > 0 ? 'unassigned' : 'over',
      };
    }

    case 'percentage': {
      const values = participants.map((p) => p.inputValue ?? 0);
      if (values.some((v) => !Number.isFinite(v) || v < 0)) {
        return { valid: false, difference: 0, message: '', error: 'Percentages cannot be negative' };
      }
      const basisPoints = values.reduce((sum, v) => sum + Math.round(v * 100), 0);
      const diffBp = 10_000 - basisPoints;
      return {
        valid: diffBp === 0,
        difference: diffBp,
        message: diffBp === 0 ? 'Adds up to 100%' : '',
        error: diffBp === 0 ? undefined : diffBp > 0 ? 'unassigned' : 'over',
      };
    }

    case 'shares': {
      const values = participants.map((p) => p.inputValue ?? 1);
      if (values.some((v) => !Number.isInteger(v) || v < 1)) {
        return {
          valid: false,
          difference: 0,
          message: '',
          error: 'Every share must be a whole number of 1 or more',
        };
      }
      const total = values.reduce((sum, v) => sum + v, 0);
      return { valid: true, difference: 0, message: `${total} share${total === 1 ? '' : 's'} total` };
    }

    default:
      return { valid: false, difference: 0, message: '', error: 'Pick a split method' };
  }
}

/* ------------------------------- Expense -------------------------------- */

export type ExpenseField = 'description' | 'amount' | 'paidBy' | 'participants' | 'date' | 'split';

export interface ExpenseFormValues {
  description: string;
  amount: number;
  paidBy: string;
  participants: ParticipantInput[];
  splitMethod: SplitMethod;
  date: string;
}

export function validateExpense(values: ExpenseFormValues): ValidationResult<ExpenseField> {
  const errors: FieldErrors<ExpenseField> = {};

  if (!values.description.trim()) errors.description = 'Add a description';
  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    errors.amount = 'Enter an amount greater than zero';
  }
  if (!values.paidBy) errors.paidBy = 'Choose who paid';
  if (values.participants.length === 0) errors.participants = 'Select at least one participant';
  if (!isValidDateString(values.date)) errors.date = 'Pick a valid date';

  if (!errors.amount && !errors.participants) {
    const split = validateSplit(values.splitMethod, values.amount, values.participants);
    if (!split.valid) {
      errors.split =
        split.error === 'unassigned' || split.error === 'over'
          ? 'The split does not add up yet'
          : (split.error ?? 'The split is not valid');
    }
  }

  return result(errors);
}

/* ------------------------------ Settlement ------------------------------ */

export type SettlementField = 'from' | 'to' | 'amount' | 'date';

export interface SettlementFormValues {
  from: string;
  to: string;
  amount: number;
  date: string;
}

export function validateSettlement(values: SettlementFormValues): ValidationResult<SettlementField> {
  const errors: FieldErrors<SettlementField> = {};

  if (!values.from) errors.from = 'Choose who paid';
  if (!values.to) errors.to = 'Choose who received';
  if (values.from && values.to && values.from === values.to) {
    errors.to = 'Pick two different people';
  }
  if (!Number.isFinite(values.amount) || values.amount <= 0) {
    errors.amount = 'Enter an amount greater than zero';
  }
  if (!isValidDateString(values.date)) errors.date = 'Pick a valid date';

  return result(errors);
}

/* ------------------------------ Recurring ------------------------------- */

export type RecurringField = ExpenseField | 'frequency' | 'endDate';

export function validateRecurring(
  values: ExpenseFormValues & { frequency: string; endDate?: string },
): ValidationResult<RecurringField> {
  const base = validateExpense(values);
  const errors: FieldErrors<RecurringField> = { ...base.errors };

  if (values.frequency !== 'weekly' && values.frequency !== 'monthly') {
    errors.frequency = 'Choose how often this repeats';
  }
  if (values.endDate) {
    if (!isValidDateString(values.endDate)) errors.endDate = 'Pick a valid end date';
    else if (values.endDate < values.date) errors.endDate = 'End date must be on or after the start date';
  }

  return result(errors);
}

/* ------------------------------ Categories ------------------------------ */

export function validateCategoryLabel(
  label: string,
  existing: string[],
): ValidationResult<'label'> {
  const errors: FieldErrors<'label'> = {};
  const trimmed = label.trim();
  if (!trimmed) errors.label = 'Name is required';
  else if (trimmed.length > 24) errors.label = 'Keep it under 24 characters';
  else if (existing.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
    errors.label = 'A category with that name already exists';
  }
  return result(errors);
}
