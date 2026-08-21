import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SECURITY_QUESTIONS } from '@/lib/securityQuestions';
import type { FieldErrors } from '@/lib/validation';

export interface QuestionPair {
  q1: string; a1: string;
  q2: string; a2: string;
}

export type QuestionField = 'q1' | 'a1' | 'q2' | 'a2';

/** A native select — Radix's Select is lovely but overkill for eight options. */
function QuestionSelect({
  id, value, onChange, exclude, describedBy, invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  exclude: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      aria-describedby={describedBy}
      aria-invalid={invalid}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-input bg-card px-3 text-label text-foreground aria-[invalid=true]:border-negative"
    >
      <option value="">Choose a question…</option>
      {SECURITY_QUESTIONS.filter((q) => q.id !== exclude).map((q) => (
        <option key={q.id} value={q.id}>{q.label}</option>
      ))}
    </select>
  );
}

export function SecurityQuestionFields({
  value, onChange, errors,
}: {
  value: QuestionPair;
  onChange: (next: QuestionPair) => void;
  errors: FieldErrors<QuestionField>;
}) {
  const set = (patch: Partial<QuestionPair>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <Field id="q1" label="First question" error={errors.q1}>
        {(p) => (
          <QuestionSelect
            id={p.id} value={value.q1} exclude={value.q2}
            describedBy={p['aria-describedby']} invalid={p['aria-invalid']}
            onChange={(v) => set({ q1: v })}
          />
        )}
      </Field>
      <Field id="a1" label="Your answer" error={errors.a1}>
        {(p) => (
          <Input {...p} autoComplete="off" placeholder="Answer"
            value={value.a1} onChange={(e) => set({ a1: e.target.value })} />
        )}
      </Field>

      <Field id="q2" label="Second question" error={errors.q2}>
        {(p) => (
          <QuestionSelect
            id={p.id} value={value.q2} exclude={value.q1}
            describedBy={p['aria-describedby']} invalid={p['aria-invalid']}
            onChange={(v) => set({ q2: v })}
          />
        )}
      </Field>
      <Field id="a2" label="Your answer" error={errors.a2}>
        {(p) => (
          <Input {...p} autoComplete="off" placeholder="Answer"
            value={value.a2} onChange={(e) => set({ a2: e.target.value })} />
        )}
      </Field>

      <p className="text-caption leading-relaxed text-muted-foreground">
        Capitals and extra spaces are ignored, so &ldquo;New York&rdquo; and &ldquo;new york&rdquo; both
        work. Answers are hashed before they are stored &mdash; nobody can read them back, so
        pick something you will still remember in a year.
      </p>
    </div>
  );
}

export function validateQuestionPair(value: QuestionPair): FieldErrors<QuestionField> {
  const errors: FieldErrors<QuestionField> = {};
  if (!value.q1) errors.q1 = 'Choose a question';
  if (!value.q2) errors.q2 = 'Choose a question';
  if (value.q1 && value.q1 === value.q2) errors.q2 = 'Choose a different question';
  if (value.a1.trim().length < 2) errors.a1 = 'Answer must be at least 2 characters';
  if (value.a2.trim().length < 2) errors.a2 = 'Answer must be at least 2 characters';
  return errors;
}
