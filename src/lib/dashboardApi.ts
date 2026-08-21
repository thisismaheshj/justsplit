import { supabase } from '@/lib/supabase';

/**
 * Cross-group reads for the dashboard. Both come back pre-aggregated from
 * Postgres: showing one number per group should not mean pulling every ledger
 * in full.
 */

function db() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export interface DashboardGroup {
  groupId: string;
  name: string;
  currency: string;
  memberCount: number;
  expenseCount: number;
  totalSpend: number;
  /** The signed-in user's own net balance in this group, in minor units. */
  myBalance: number;
  /** Null for a group with nothing in it yet. */
  lastActivity: string | null;
}

export async function fetchDashboardGroups(): Promise<DashboardGroup[]> {
  const { data, error } = await db().rpc('dashboard_groups');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    groupId: row.group_id,
    name: row.name,
    currency: row.currency,
    memberCount: row.member_count,
    expenseCount: row.expense_count,
    totalSpend: Number(row.total_spend),
    myBalance: Number(row.my_balance),
    lastActivity: row.last_activity,
  }));
}

export interface ActivityEntry {
  id: string;
  kind: 'expense' | 'settlement';
  groupId: string;
  groupName: string;
  currency: string;
  description: string | null;
  amount: number;
  date: string;
  actorName: string;
  otherName: string | null;
  category: string | null;
}

export async function fetchDashboardActivity(limit = 12): Promise<ActivityEntry[]> {
  const { data, error } = await db().rpc('dashboard_activity', { p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.entry_id,
    kind: row.kind === 'settlement' ? 'settlement' : 'expense',
    groupId: row.group_id,
    groupName: row.group_name,
    currency: row.currency,
    description: row.description,
    amount: Number(row.amount),
    date: row.entry_date,
    actorName: row.actor_name,
    otherName: row.other_name,
    category: row.category,
  }));
}

export interface CurrencyTotal {
  currency: string;
  /** Sum of positive balances across groups in this currency. */
  owedToYou: number;
  /** Sum of negative balances, as a positive number. */
  youOwe: number;
  net: number;
  groupCount: number;
}

/**
 * Totals are kept per currency and never converted. Adding rupees to dollars
 * would need an exchange rate, and a made-up rate silently turns a wrong number
 * into a confident one.
 */
export function totalsByCurrency(groups: DashboardGroup[]): CurrencyTotal[] {
  const map = new Map<string, CurrencyTotal>();

  for (const group of groups) {
    const entry = map.get(group.currency) ?? {
      currency: group.currency,
      owedToYou: 0,
      youOwe: 0,
      net: 0,
      groupCount: 0,
    };
    if (group.myBalance > 0) entry.owedToYou += group.myBalance;
    if (group.myBalance < 0) entry.youOwe += -group.myBalance;
    entry.net += group.myBalance;
    entry.groupCount += 1;
    map.set(group.currency, entry);
  }

  // Currencies you actually have money moving in come first.
  return [...map.values()].sort(
    (a, b) => Math.abs(b.net) - Math.abs(a.net) || a.currency.localeCompare(b.currency),
  );
}
