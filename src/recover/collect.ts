/**
 * Pure helpers for the recovery page (recover.html). Both Supabase projects
 * that held the ledger were deleted, so the only copies left are whatever a
 * phone kept: the pre-Phase-4 local store, the last-opened group id, and --
 * with luck -- cached API responses. Nothing here writes or deletes anything.
 */

export const LEGACY_KEY = 'splitgroup-app-state-v1';
export const ACTIVE_GROUP_KEY = 'justsplit-active-group';

/** Every project the live app has pointed at, oldest first. */
export const PAST_HOSTS = [
  'https://jugylopmjqidimymhapv.supabase.co', // Aug 21 – Sep 23
  'https://emsdruoczxumkpybvxot.supabase.co', // Oct 8 – Oct 22
];

export interface AccountHint {
  userId: string | null;
  email: string | null;
  name: string | null;
}

/**
 * Supabase keeps the session under sb-<ref>-auth-token. The tokens are useless
 * now the projects are gone, but they are still credentials, so only the
 * account identity leaves the phone.
 */
export function accountFromAuthToken(raw: string): AccountHint | null {
  try {
    const parsed = JSON.parse(raw) as { user?: { id?: string; email?: string; user_metadata?: { name?: string } } };
    const user = parsed?.user;
    if (!user) return null;
    return { userId: user.id ?? null, email: user.email ?? null, name: user.user_metadata?.name ?? null };
  } catch {
    return null;
  }
}

/** A copy of this origin's localStorage with every credential stripped out. */
export function snapshotStorage(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null) continue;
    const value = storage.getItem(key);
    if (value === null) continue;
    if (/^sb-.*-auth-token/.test(key)) {
      out[key] = { account: accountFromAuthToken(value), tokens: 'removed' };
    } else if (/code-verifier/.test(key)) {
      out[key] = 'removed';
    } else {
      out[key] = value;
    }
  }
  return out;
}

export interface LegacySummary {
  groupId: string | null;
  groupName: string | null;
  people: number;
  expenses: number;
  settlements: number;
}

/** Counts what the old browser-only store still holds, if anything. */
export function summarizeLegacy(raw: string | null): LegacySummary | null {
  if (!raw) return null;
  try {
    const state = (JSON.parse(raw) as { state?: Record<string, unknown> })?.state;
    if (!state) return null;
    const group = state.group as { id?: string; name?: string } | undefined;
    const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
    return {
      groupId: group?.id ?? null,
      groupName: group?.name ?? null,
      people: count(state.people),
      expenses: count(state.expenses),
      settlements: count(state.settlements),
    };
  } catch {
    return null;
  }
}

export interface CachedGroup {
  group: unknown;
  members: unknown[] | null;
  expenses: unknown[] | null;
  settlements: unknown[] | null;
  recurring: unknown[] | null;
  categories: unknown[] | null;
}

export interface ServerFindings {
  host: string;
  groupList: unknown[] | null;
  groups: Record<string, CachedGroup>;
}

export interface Totals {
  groups: number;
  expenses: number;
  settlements: number;
}

/** What was actually recovered, across the local store and both servers. */
export function totals(legacy: LegacySummary | null, servers: ServerFindings[]): Totals {
  const t: Totals = { groups: 0, expenses: 0, settlements: 0 };
  if (legacy && (legacy.people > 0 || legacy.expenses > 0)) {
    t.groups += 1;
    t.expenses += legacy.expenses;
    t.settlements += legacy.settlements;
  }
  for (const server of servers) {
    for (const g of Object.values(server.groups)) {
      const hasAnything = g.group || g.members?.length || g.expenses?.length || g.settlements?.length;
      if (!hasAnything) continue;
      t.groups += 1;
      t.expenses += g.expenses?.length ?? 0;
      t.settlements += g.settlements?.length ?? 0;
    }
  }
  return t;
}

/** Group ids worth asking the cache about, without duplicates. */
export function candidateGroupIds(...sources: Array<string | null | undefined | Array<{ id?: unknown }>>): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    if (typeof source === 'string') ids.add(source);
    else for (const row of source) if (typeof row?.id === 'string') ids.add(row.id);
  }
  return [...ids];
}
