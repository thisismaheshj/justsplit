export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export type CategoryId =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'rent'
  | 'hotel'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'other'
  | (string & {}); // custom categories use free-form ids

export interface Category {
  id: CategoryId;
  label: string;
  /** lucide icon name, e.g. "Utensils" */
  icon: string;
  isCustom?: boolean;
}

export interface Person {
  id: string;
  name: string;
  /** base64 data URL, optional */
  avatarPhoto?: string;
  /** hex, deterministically derived from id when no photo */
  avatarColor: string;
  /** ISO datetime */
  createdAt: string;
  /** soft-delete flag */
  archived?: boolean;
  /** Set when this member is a real account; null for a "ghost" member. */
  userId?: string | null;
  /** 'owner' for the person who created the group. */
  role?: 'owner' | 'member';
}

export interface ParticipantShare {
  personId: string;
  /**
   * exact      -> the exact minor-unit amount owed
   * percentage -> percentage (0-100, up to 2 decimals)
   * shares     -> integer share units (>= 1)
   * equal      -> not required on input; computed on save
   */
  inputValue?: number;
  /** Always computed and stored: final minor-unit amount this person owes. */
  amountOwed: number;
}

export interface Expense {
  id: string;
  type: 'expense';
  description: string;
  /** minor units */
  amount: number;
  paidBy: string;
  participants: ParticipantShare[];
  splitMethod: SplitMethod;
  category: CategoryId;
  /** "YYYY-MM-DD" local date string */
  date: string;
  note?: string;
  recurringExpenseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  type: 'settlement';
  from: string;
  to: string;
  /** minor units */
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type Transaction = Expense | Settlement;

export type RecurringFrequency = 'weekly' | 'monthly';

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: ParticipantShare[];
  splitMethod: SplitMethod;
  category: CategoryId;
  frequency: RecurringFrequency;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  active: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  /** ISO 4217 code */
  currency: string;
  createdAt: string;
}

export interface AppState {
  group: Group | null;
  people: Person[];
  expenses: Expense[];
  settlements: Settlement[];
  recurringExpenses: RecurringExpense[];
  categories: Category[];
}

/* ---- Input shapes used by store actions ---- */

export interface ParticipantInput {
  personId: string;
  inputValue?: number;
}

export interface ExpenseInput {
  description: string;
  amount: number;
  paidBy: string;
  participants: ParticipantInput[];
  splitMethod: SplitMethod;
  category: CategoryId;
  date: string;
  note?: string;
  recurringExpenseId?: string;
}

export interface SettlementInput {
  from: string;
  to: string;
  amount: number;
  date: string;
  note?: string;
}

export interface RecurringInput {
  description: string;
  amount: number;
  paidBy: string;
  participants: ParticipantInput[];
  splitMethod: SplitMethod;
  category: CategoryId;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  note?: string;
  active?: boolean;
  /**
   * True when the caller has already recorded the occurrence dated `startDate`
   * as a normal expense, so the template should schedule from the next cycle.
   */
  firstOccurrenceCreated?: boolean;
}

export interface DebtTransfer {
  from: string;
  to: string;
  amount: number;
}

export type BalanceMap = Record<string, number>;
