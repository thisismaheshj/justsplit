import { describe, expect, it } from 'vitest';
import { validateQuestionPair } from '@/components/auth/SecurityQuestionFields';
import {
  ANSWER_MIN_LENGTH,
  SECURITY_QUESTIONS,
  normaliseAnswer,
  questionLabel,
} from '@/lib/securityQuestions';

/** Mirrors the decoy bank in recovery_questions_for_email(). */
const DECOY_BANK = [
  'first_school',
  'birth_city',
  'childhood_friend',
  'first_pet',
  'mothers_maiden',
  'first_employer',
  'favourite_teacher',
  'street_grew_up',
];

describe('security question bank', () => {
  /**
   * The decoys shown for an unknown email are drawn from a bank hard-coded in
   * Postgres. If the two lists drift apart, an unknown address can return an id
   * the UI cannot label — which is exactly the tell the decoys exist to hide.
   */
  it('matches the decoy bank in the migration, exactly', () => {
    expect(SECURITY_QUESTIONS.map((q) => q.id)).toEqual(DECOY_BANK);
  });

  it('has a human label for every id, including decoy ids', () => {
    for (const id of DECOY_BANK) {
      expect(questionLabel(id)).not.toBe(id);
      expect(questionLabel(id).length).toBeGreaterThan(0);
    }
  });

  it('uses unique ids', () => {
    const ids = SECURITY_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the raw id for an unknown question', () => {
    expect(questionLabel('retired_question')).toBe('retired_question');
  });
});

describe('normaliseAnswer', () => {
  /** Must agree with normalise_recovery_answer() in Postgres, or an answer
   *  accepted at signup stops matching at recovery. */
  it('lowercases, trims, and collapses internal whitespace', () => {
    expect(normaliseAnswer('  Fluffy  ')).toBe('fluffy');
    expect(normaliseAnswer('New   York')).toBe('new york');
    expect(normaliseAnswer('\tSt Marys\n')).toBe('st marys');
  });

  it('is idempotent', () => {
    const once = normaliseAnswer('  MiXeD   Case  ');
    expect(normaliseAnswer(once)).toBe(once);
  });

  it('treats the casing variants a user might type as the same answer', () => {
    const variants = ['Pune', 'pune', 'PUNE', '  pune ', 'pune  '];
    const normalised = new Set(variants.map(normaliseAnswer));
    expect(normalised.size).toBe(1);
  });
});

describe('validateQuestionPair', () => {
  const valid = { q1: 'first_pet', a1: 'Fluffy', q2: 'birth_city', a2: 'Pune' };

  it('accepts two different questions with real answers', () => {
    expect(validateQuestionPair(valid)).toEqual({});
  });

  it('requires both questions to be chosen', () => {
    expect(validateQuestionPair({ ...valid, q1: '' }).q1).toBeDefined();
    expect(validateQuestionPair({ ...valid, q2: '' }).q2).toBeDefined();
  });

  /** set_recovery_questions() raises on a duplicate pair, so catching it here
   *  turns a 500 into an inline message. */
  it('rejects the same question twice', () => {
    expect(validateQuestionPair({ ...valid, q2: 'first_pet' }).q2).toBeDefined();
  });

  it('rejects answers shorter than the minimum, whitespace not counted', () => {
    expect(validateQuestionPair({ ...valid, a1: 'a' }).a1).toBeDefined();
    expect(validateQuestionPair({ ...valid, a1: '   ' }).a1).toBeDefined();
    expect(validateQuestionPair({ ...valid, a2: ' x ' }).a2).toBeDefined();
  });

  it('accepts an answer exactly at the minimum length', () => {
    const answer = 'x'.repeat(ANSWER_MIN_LENGTH);
    expect(validateQuestionPair({ ...valid, a1: answer, a2: answer })).toEqual({});
  });
});
