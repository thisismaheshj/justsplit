import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, authRedirectUrl, authErrorMessage } from '@/lib/supabase';

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

export interface AuthStore {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  /** Last auth error, for surfacing in the UI. */
  error: string | null;

  init: () => () => void;
  clearError: () => void;

  signUpWithEmail: (input: { name: string; email: string; password: string }) => Promise<boolean>;
  signInWithEmail: (input: { email: string; password: string }) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

function notConfigured(): string {
  return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.';
}

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
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
        set({ status: 'anon', user: null, profile: null });
        return;
      }
      set({ status: 'authed', user: session.user });
      set({ profile: await loadProfile(session.user.id) });
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

  signInWithGoogle: async () => {
    if (!supabase) return set({ error: notConfigured() }), false;
    set({ error: null });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    });
    if (error) {
      set({ error: authErrorMessage(error) });
      return false;
    }
    return true; // the browser is navigating away
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ status: 'anon', user: null, profile: null, error: null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    set({ profile: await loadProfile(user.id) });
  },
}));

export { isSupabaseConfigured };
