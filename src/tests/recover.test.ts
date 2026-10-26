import { describe, expect, it } from 'vitest';
import { candidateGroupIds, snapshotStorage, summarizeLegacy, totals } from '@/recover/collect';

function fakeStorage(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => entries[k] ?? null,
  };
}

describe('snapshotStorage', () => {
  it('keeps the account identity but never the tokens', () => {
    const snap = snapshotStorage(
      fakeStorage({
        'sb-emsdruoczxumkpybvxot-auth-token': JSON.stringify({
          access_token: 'secret-access',
          refresh_token: 'secret-refresh',
          user: { id: 'u1', email: 'priya@example.com', user_metadata: { name: 'Priya' } },
        }),
        'sb-emsdruoczxumkpybvxot-auth-token-code-verifier': 'secret-verifier',
        'justsplit-active-group': 'g1',
      }),
    );
    const text = JSON.stringify(snap);
    expect(text).not.toContain('secret');
    expect(snap['sb-emsdruoczxumkpybvxot-auth-token']).toEqual({
      account: { userId: 'u1', email: 'priya@example.com', name: 'Priya' },
      tokens: 'removed',
    });
    expect(snap['justsplit-active-group']).toBe('g1');
  });
});

describe('summarizeLegacy', () => {
  it('counts the old on-phone group', () => {
    const raw = JSON.stringify({
      state: { group: { id: 'g0', name: 'Goa' }, people: [{}, {}], expenses: [{}, {}, {}], settlements: [{}] },
    });
    expect(summarizeLegacy(raw)).toEqual({ groupId: 'g0', groupName: 'Goa', people: 2, expenses: 3, settlements: 1 });
  });

  it('is null for missing or broken data', () => {
    expect(summarizeLegacy(null)).toBeNull();
    expect(summarizeLegacy('{not json')).toBeNull();
  });
});

describe('totals', () => {
  it('adds the local group to groups recovered from either server, skipping empty ones', () => {
    const t = totals({ groupId: 'g0', groupName: 'Goa', people: 2, expenses: 3, settlements: 1 }, [
      {
        host: 'a',
        groupList: null,
        groups: {
          g1: { group: { id: 'g1' }, members: [], expenses: [{}, {}], settlements: null, recurring: null, categories: null },
          g2: { group: null, members: null, expenses: null, settlements: null, recurring: null, categories: null },
        },
      },
    ]);
    expect(t).toEqual({ groups: 2, expenses: 5, settlements: 1 });
  });
});

describe('candidateGroupIds', () => {
  it('merges ids from strings and rows without duplicates', () => {
    expect(candidateGroupIds('g1', null, [{ id: 'g1' }, { id: 'g2' }, { id: 3 }])).toEqual(['g1', 'g2']);
  });
});
