import { beforeEach, describe, expect, it } from 'vitest';
import { isProfileComplete, validateProfile } from '@/lib/authValidation';
import { useGroupStore } from '@/store/useGroupStore';
import type { Person } from '@/types';

const PHOTO = 'data:image/jpeg;base64,AAAA';

describe('validateProfile', () => {
  it('requires a photo', () => {
    const result = validateProfile({ name: 'Priya', photo: null });
    expect(result.valid).toBe(false);
    expect(result.errors.photo).toBeDefined();
    expect(result.errors.name).toBeUndefined();
  });

  it('requires a non-blank name', () => {
    expect(validateProfile({ name: '   ', photo: PHOTO }).errors.name).toBe('Enter your name');
  });

  it('caps the name at the 40 characters a group seat can hold', () => {
    expect(validateProfile({ name: 'x'.repeat(41), photo: PHOTO }).valid).toBe(false);
    expect(validateProfile({ name: 'x'.repeat(40), photo: PHOTO }).valid).toBe(true);
  });
});

describe('isProfileComplete', () => {
  it('is false until both a name and a photo are present', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete({ name: 'Priya', avatarUrl: null })).toBe(false);
    expect(isProfileComplete({ name: ' ', avatarUrl: PHOTO })).toBe(false);
    expect(isProfileComplete({ name: 'Priya', avatarUrl: PHOTO })).toBe(true);
  });
});

describe('syncAccountSeat', () => {
  const seat = (over: Partial<Person>): Person => ({
    id: over.id ?? 'p',
    name: 'Old',
    avatarColor: '#4A5A6B',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  beforeEach(() => {
    useGroupStore.setState({
      people: [
        seat({ id: 'me', userId: 'u1', name: 'Me' }),
        seat({ id: 'ghost', userId: null, name: 'Rahul' }),
        seat({ id: 'other', userId: 'u2', name: 'Amit', avatarPhoto: 'amit.jpg' }),
      ],
    });
  });

  it("shows the account's name and photo on its own seat only", () => {
    useGroupStore.getState().syncAccountSeat('u1', { name: 'Priya Shah', avatarPhoto: PHOTO });
    const [me, ghost, other] = useGroupStore.getState().people;
    expect(me).toMatchObject({ name: 'Priya Shah', avatarPhoto: PHOTO });
    expect(ghost.name).toBe('Rahul');
    expect(ghost.avatarPhoto).toBeUndefined();
    expect(other).toMatchObject({ name: 'Amit', avatarPhoto: 'amit.jpg' });
  });

  it('does not replace state when nothing changed', () => {
    useGroupStore.getState().syncAccountSeat('u1', { name: 'Priya', avatarPhoto: PHOTO });
    const before = useGroupStore.getState().people;
    useGroupStore.getState().syncAccountSeat('u1', { name: 'Priya', avatarPhoto: PHOTO });
    expect(useGroupStore.getState().people).toBe(before);
  });
});
