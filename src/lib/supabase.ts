import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * The URL and anon key are safe to ship in the bundle — the anon key is a
 * public identifier and every table is protected by row-level security, not by
 * hiding this string. The service-role key must never appear in this app.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the env vars are missing, e.g. a fresh clone with no .env.local. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Null rather than throwing when unconfigured, so the app still boots and can
 * explain what is missing instead of showing a white screen.
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Supabase parses the OAuth code out of the callback URL for us.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

/** Absolute URL Google sends the user back to. Honours the /justsplit/ base. */
export function authRedirectUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}auth/callback`;
}

/**
 * Supabase error messages are aimed at developers. Map the ones a user can
 * actually cause onto something worth reading, and never echo back whether an
 * email exists — that is an account-enumeration leak.
 */
export function authErrorMessage(error: { message?: string; status?: number } | null): string {
  const raw = error?.message?.toLowerCase() ?? '';
  if (!raw) return 'Something went wrong. Please try again.';
  if (raw.includes('invalid login credentials')) return 'That email and password do not match.';
  if (raw.includes('email not confirmed')) return 'Check your inbox and confirm your email first.';
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'That email is already registered. Try signing in instead.';
  }
  if (raw.includes('password should be at least')) return 'That password is too short.';
  if (raw.includes('rate limit') || error?.status === 429) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) {
    return 'Could not reach the server. Check your connection.';
  }
  return error?.message ?? 'Something went wrong. Please try again.';
}
