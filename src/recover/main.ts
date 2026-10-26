import { createClient } from '@supabase/supabase-js';
import {
  ACTIVE_GROUP_KEY,
  LEGACY_KEY,
  PAST_HOSTS,
  candidateGroupIds,
  snapshotStorage,
  summarizeLegacy,
  totals,
  type CachedGroup,
  type ServerFindings,
} from './collect';

/**
 * The read queries exactly as the app sent them, because Safari matches a
 * cached response on the full URL. group_members gained invite_email in
 * Phase 9, so both shapes are tried.
 */
const GROUP_COLUMNS = 'id, name, currency, created_at';
const MEMBER_COLUMNS = [
  'id, user_id, name, avatar_color, avatar_photo, invite_email, archived, role, created_at',
  'id, user_id, name, avatar_color, avatar_photo, archived, role, created_at',
];
const EXPENSE_COLUMNS =
  'id, description, amount, paid_by, split_method, category, date, note, recurring_expense_id, created_at, updated_at, expense_participants(member_id, input_value, amount_owed, position)';
const SETTLEMENT_COLUMNS = 'id, from_member, to_member, amount, date, note, created_at, updated_at';
const RECURRING_COLUMNS =
  'id, description, amount, paid_by, split_method, category, frequency, start_date, next_due_date, end_date, active, note, created_at, updated_at, recurring_participants(member_id, input_value, amount_owed, position)';

const log = document.getElementById('log')!;
const result = document.getElementById('result')!;
const actions = document.getElementById('actions')!;

function step(text: string, state: 'run' | 'ok' | 'none' = 'run') {
  const li = document.createElement('li');
  li.dataset.state = state;
  li.textContent = text;
  log.appendChild(li);
  return (next: string, nextState: 'ok' | 'none') => {
    li.textContent = next;
    li.dataset.state = nextState;
  };
}

/**
 * Answers only from Safari's cache. The original requests carried apikey and
 * Authorization headers, but the cache is keyed on the URL alone; dropping
 * them keeps this a simple request, so no preflight goes to a host that no
 * longer exists. Anything not cached fails fast on DNS -- as long as the
 * client's automatic retries (1s, 2s, 4s per query) are switched off.
 */
function cacheOnlyFetch(hits: string[]) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if ((init?.method ?? 'GET').toUpperCase() !== 'GET') throw new TypeError('Recovery only reads');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { cache: 'force-cache', signal: controller.signal });
      if (res.ok) hits.push(url);
      return res;
    } finally {
      window.clearTimeout(timer);
    }
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

async function rows(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<unknown[] | null> {
  try {
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

async function probeServer(host: string, seedIds: string[], hits: string[]): Promise<ServerFindings> {
  const client = createClient(host, 'recovery', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: cacheOnlyFetch(hits) },
  });

  const groupList = await rows(
    client.from('groups').select(GROUP_COLUMNS).order('created_at', { ascending: true }).retry(false),
  );

  const groups: Record<string, CachedGroup> = {};
  for (const id of candidateGroupIds(...seedIds, groupList as Array<{ id?: unknown }> | null)) {
    let group: unknown = null;
    try {
      const { data } = await client.from('groups').select(GROUP_COLUMNS).eq('id', id).single().retry(false);
      group = data ?? null;
    } catch {
      group = null;
    }

    let members: unknown[] | null = null;
    for (const columns of MEMBER_COLUMNS) {
      members = await rows(
        client
          .from('group_members')
          .select(columns)
          .eq('group_id', id)
          .order('created_at', { ascending: true })
          .retry(false),
      );
      if (members) break;
    }

    groups[id] = {
      group,
      members,
      expenses: await rows(client.from('expenses').select(EXPENSE_COLUMNS).eq('group_id', id).retry(false)),
      settlements: await rows(client.from('settlements').select(SETTLEMENT_COLUMNS).eq('group_id', id).retry(false)),
      recurring: await rows(client.from('recurring_expenses').select(RECURRING_COLUMNS).eq('group_id', id).retry(false)),
      categories: await rows(client.from('group_categories').select('id, label, icon').eq('group_id', id).retry(false)),
    };
  }

  return { host, groupList, groups };
}

function offerFile(report: unknown) {
  const date = new Date().toISOString().slice(0, 10);
  const name = `justsplit-recovery-${date}.json`;
  const json = JSON.stringify(report, null, 2);
  const file = new File([json], name, { type: 'application/json' });

  const share = document.createElement('button');
  share.className = 'primary';
  share.textContent = 'Send this file';
  share.onclick = async () => {
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'JustSplit recovery' });
        return;
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
    }
    download.click();
  };

  const download = document.createElement('a');
  download.className = 'secondary';
  download.textContent = 'Save to Files';
  download.download = name;
  download.href = URL.createObjectURL(file);

  actions.append(share, download);
}

async function run() {
  let storage: Record<string, unknown> = {};
  let legacyRaw: string | null = null;
  let activeGroup: string | null = null;

  const done1 = step('Reading what this phone saved for JustSplit…');
  try {
    storage = snapshotStorage(localStorage);
    legacyRaw = localStorage.getItem(LEGACY_KEY);
    activeGroup = localStorage.getItem(ACTIVE_GROUP_KEY);
  } catch {
    // Private browsing or blocked storage: carry on with the cache.
  }
  const legacy = summarizeLegacy(legacyRaw);
  const keyCount = Object.keys(storage).length;
  done1(
    legacy
      ? `Found the old on-phone group “${legacy.groupName ?? 'Untitled'}”: ${plural(legacy.people, 'person').replace(/persons$/, 'people')}, ${plural(legacy.expenses, 'expense')}`
      : keyCount
        ? `Saved settings found (${keyCount}), but no old on-phone group`
        : 'Nothing saved on this phone for JustSplit',
    legacy || keyCount ? 'ok' : 'none',
  );

  const hits: string[] = [];
  const servers: ServerFindings[] = [];
  const seeds = [activeGroup, legacy?.groupId].filter((id): id is string => Boolean(id));
  for (const [index, host] of PAST_HOSTS.entries()) {
    const label = index === 0 ? 'August–September' : 'October';
    const done = step(`Checking Safari’s copies from the ${label} database…`);
    const before = hits.length;
    const findings = await probeServer(host, seeds, hits);
    servers.push(findings);
    const found = hits.length - before;
    done(
      found ? `${label} database: ${found} saved ${found === 1 ? 'copy' : 'copies'} found` : `${label} database: nothing saved`,
      found ? 'ok' : 'none',
    );
  }

  const t = totals(legacy, servers);
  const report = {
    kind: 'justsplit-recovery',
    version: 1,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    localStorage: storage,
    legacy,
    activeGroup,
    servers,
    cachedUrls: hits,
    totals: t,
  };

  result.textContent =
    t.groups > 0
      ? `Recovered ${plural(t.groups, 'group')}, ${plural(t.expenses, 'expense')} and ${plural(t.settlements, 'settlement')}. Send the file below.`
      : keyCount
        ? 'No splits were found, but send the file anyway: it may still help.'
        : 'Nothing was found on this phone. If you used JustSplit in another browser, open this page there too.';
  result.dataset.state = t.groups > 0 ? 'ok' : 'none';
  offerFile(report);
}

void run();
