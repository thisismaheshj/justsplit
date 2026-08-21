/**
 * Fixed question bank rather than free text. Two reasons: people write
 * guessable questions when left to themselves, and the ids here must match the
 * decoy bank in the recovery_questions_for_email() migration so that a probe
 * against an unknown email is indistinguishable from a real account.
 *
 * Never remove an id — an existing user's stored question would stop resolving.
 * Add to the end instead.
 */
export interface SecurityQuestion {
  id: string;
  label: string;
}

export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  { id: 'first_school',     label: 'What was the name of your first school?' },
  { id: 'birth_city',       label: 'What city were you born in?' },
  { id: 'childhood_friend', label: "What was your childhood best friend's first name?" },
  { id: 'first_pet',        label: 'What was the name of your first pet?' },
  { id: 'mothers_maiden',   label: "What is your mother's maiden name?" },
  { id: 'first_employer',   label: 'Who was your first employer?' },
  { id: 'favourite_teacher',label: "What was your favourite teacher's surname?" },
  { id: 'street_grew_up',   label: 'What street did you grow up on?' },
];

export function questionLabel(id: string): string {
  return SECURITY_QUESTIONS.find((q) => q.id === id)?.label ?? id;
}

/** Mirrors normalise_recovery_answer() in Postgres, for preview only — the
 *  database always re-normalises, so the two can never drift apart in effect. */
export function normaliseAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, ' ').toLowerCase();
}

export const ANSWER_MIN_LENGTH = 2;
