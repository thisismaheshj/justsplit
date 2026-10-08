import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, authErrorMessage } from '@/lib/supabase';

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * 'loading' until we know whether a persisted session exists. Routes must not
 * decide anything while loading or a returning user gets bounced to /login on
 * the first frame — the same trap HydrationGate already solves for the group.
 */
export type AuthStatus = 'loading' | 'authed' | 'anon';

/**
 * Tracked separately from AuthStatus: a session can be known while its
 * profile is still in flight, and the photo guard must not mistake "not loaded
 * yet" for "has no photo" any more than RequireAuth may mistake loading for anon.
 */
export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AuthStore {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  profileStatus: ProfileStatus;
  /** Last auth error, for surfacing in the UI. */
  error: string | null;

  init: () => () => void;
  clearError: () => void;

  signUpWithEmail: (input: { name: string; email: string; password: string }) => Promise<boolean>;
  signInWithEmail: (input: { email: string; password: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Saves name and photo. Returns an error message, or null on success. */
  saveProfile: (input: { name: string; avatarUrl: string }) => Promise<string | null>;
}

function notConfigured(): string {
  return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.';
}

/**
 * Null means "no row"; a failed read throws, so the caller can tell the two
 * apart instead of sending someone with a photo back to the photo step.
 */
async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    name: (data.name as string) ?? '',
    email: (data.email as string | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
  };
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'loading',
  user: null,
  profile: null,
  profileStatus: 'idle',
  error: null,

  /**
   * Called once from main.tsx. Reads any persisted session, then subscribes to
   * Supabase's own auth events so a token refresh, a sign-out in another tab,
   * or the OAuth redirect all land in the same place.
   */
  init: () => {
    if (!supabase) {
      set({ status: 'anon', error: notConfigured() });
      return () => {};
    }

    const apply = async (session: Session | null) => {
      if (!session?.user) {
        set({ status: 'anon', user: null, profile: null, profileStatus: 'idle' });
        return;
      }
      // Token refreshes re-run this for the same user; reloading quietly in
      // the background keeps the screen from flashing back to a skeleton.
      const sameUser = get().profile?.id === session.user.id;
      set({
        status: 'authed',
        user: session.user,
        ...(sameUser ? {} : { profile: null, profileStatus: 'loading' as const }),
      });
      await get().refreshProfile();
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void apply(session);
    });

    return () => sub.subscription.unsubscribe();
  },

  clearError: () => set({ error: null }),

  signUpWithEmail: async ({ name, email, password }) => {
    if (!supabase) return set({ error: notConfigured() }), false;
    set({ error: null });

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Read by the handle_new_user trigger to seed profiles.name.
      options: { data: { full_name: name.trim() } },
    });

    if (error) {
      set({ error: authErrorMessage(error) });
      return false;
    }
    // With email confirmation switched on, there is no session yet.
    if (!data.session) {
      set({ error: 'Check your inbox to confirm your email, then sign in.' });
      return false;
    }
    return true;
  },

  signInWithEmail: async ({ email, password }) => {
    if (!supabase) return set({ error: notConfigured() }), false;
    set({ error: null });

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      set({ error: authErrorMessage(error) });
      return false;
    }
    return true;
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ status: 'anon', user: null, profile: null, profileStatus: 'idle', error: null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const profile = await loadProfile(user.id);
      // A sign-out may have landed while the read was in flight.
      if (get().user?.id !== user.id) return;
      set({ profile, profileStatus: 'ready' });
    } catch {
      if (get().user?.id !== user.id) return;
      // Keep a profile we already have; only block when there is nothing.
      set((s) => ({ profileStatus: s.profile ? 'ready' : 'error' }));
    }
  },

  saveProfile: async ({ name, avatarUrl }) => {
    const { user } = get();
    if (!supabase || !user) return notConfigured();

    const trimmed = name.trim();
    const { error } = await supabase
      .from('profiles')
      // Upsert rather than update: an account created before the profile
      // trigger existed may have no row yet.
      .upsert({ id: user.id, name: trimmed, email: user.email ?? null, avatar_url: avatarUrl });
    if (error) return authErrorMessage(error);

    // Migration 0016 mirrors the profile onto every seat this account holds,
    // server-side. Writing the seats here as well means fellow members see the
    // new photo even on a database that has not had that migration yet; the
    // RLS update policy already allows it, since these are the caller's groups.
    await supabase
      .from('group_members')
      .update({ name: trimmed.slice(0, 40), avatar_photo: avatarUrl })
      .eq('user_id', user.id);

    set((s) => ({
      profile: {
        id: user.id,
        email: s.profile?.email ?? user.email ?? null,
        name: trimmed,
        avatarUrl,
      },
      profileStatus: 'ready',
    }));
    return null;
  },
}));

export { isSupabaseConfigured };
