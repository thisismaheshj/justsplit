import { create } from 'zustand';
import { supabase, authErrorMessage } from '@/lib/supabase';

export interface RecoveryState {
  /** The two question ids the signed-in user picked, or null if never set up. */
  questions: [string, string] | null;
  loaded: boolean;

  load: () => Promise<void>;
  save: (input: { q1: string; a1: string; q2: string; a2: string }) => Promise<string | null>;
}

/** Recovery config for the *signed-in* user: reading and setting their questions. */
export const useRecoveryStore = create<RecoveryState>((set) => ({
  questions: null,
  loaded: false,

  load: async () => {
    if (!supabase) return set({ loaded: true });
    // Column grants mean only the question ids come back — never the hashes.
    const { data, error } = await supabase
      .from('user_recovery')
      .select('question_1, question_2')
      .maybeSingle();
    if (error || !data) return set({ questions: null, loaded: true });
    set({ questions: [data.question_1, data.question_2], loaded: true });
  },

  save: async ({ q1, a1, q2, a2 }) => {
    if (!supabase) return 'Supabase is not configured.';
    const { error } = await supabase.rpc('set_recovery_questions', {
      p_question_1: q1, p_answer_1: a1,
      p_question_2: q2, p_answer_2: a2,
    });
    if (error) return authErrorMessage(error);
    set({ questions: [q1, q2] });
    return null;
  },
}));

/* ------------------------------------------------------- signed-out flow -- */

export interface RecoveryChallenge {
  questions: [string, string];
}

/**
 * Questions for a locked-out visitor. Always returns a pair, even for an
 * address with no account — the decoys are generated in Postgres so that
 * probing cannot tell the difference.
 */
export async function fetchRecoveryChallenge(email: string): Promise<RecoveryChallenge | string> {
  if (!supabase) return 'Supabase is not configured.';
  const { data, error } = await supabase.rpc('recovery_questions_for_email', { p_email: email });
  if (error) return authErrorMessage(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return 'Could not start recovery. Try again.';
  return { questions: [row.question_1, row.question_2] };
}

export interface ResetOutcome {
  ok: boolean;
  error?: string;
  attemptsLeft?: number | null;
  lockedUntil?: string | null;
}

/**
 * Setting a password for a signed-out user needs the service-role key, so this
 * goes through the password-recovery edge function rather than the client.
 */
export async function completePasswordReset(input: {
  email: string;
  answers: [string, string];
  newPassword: string;
}): Promise<ResetOutcome> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const { data, error } = await supabase.functions.invoke('password-recovery', {
    body: { email: input.email, answers: input.answers, newPassword: input.newPassword },
  });

  if (error) {
    // Non-2xx from the function carries our message in the response body.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        return {
          ok: false,
          error: body.error ?? 'Could not reset your password.',
          attemptsLeft: body.attemptsLeft ?? null,
          lockedUntil: body.lockedUntil ?? null,
        };
      } catch {
        /* fall through to the generic message */
      }
    }
    return { ok: false, error: 'Could not reach the recovery service. Try again.' };
  }

  if (data?.ok) return { ok: true };
  return { ok: false, error: data?.error ?? 'Could not reset your password.' };
}
