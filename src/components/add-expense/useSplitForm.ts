import { useCallback, useMemo, useState } from 'react';
import type { ParticipantInput, ParticipantShare, Person, SplitMethod } from '@/types';
import { computeSplit } from '@/lib/calculations';
import { validateSplit, type SplitValidation } from '@/lib/validation';
import { fromMinorUnits, toInputString, toMinorUnits } from '@/lib/currency';

export interface SplitFormSeed {
  amountText?: string;
  splitMethod?: SplitMethod;
  selected?: string[];
  participants?: ParticipantShare[];
}

/**
 * Owns everything about "how is this amount divided": the raw amount text, the
 * chosen method, who is involved, and each method's per-person inputs.
 * Shared by the Add Expense screen and the recurring template dialog.
 */
export function useSplitForm(people: Person[], currency: string, seed?: SplitFormSeed) {
  const [amountText, setAmountText] = useState(seed?.amountText ?? '');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(seed?.splitMethod ?? 'equal');
  const [selected, setSelected] = useState<string[]>(
    seed?.selected ?? people.map((p) => p.id),
  );

  const [exactValues, setExactValues] = useState<Record<string, string>>(() =>
    seedExact(seed, currency),
  );
  const [percentValues, setPercentValues] = useState<Record<string, string>>(() =>
    seedPercent(seed),
  );
  const [shareValues, setShareValues] = useState<Record<string, number>>(() => seedShares(seed));

  const amount = useMemo(() => {
    if (!amountText.trim()) return 0;
    const minor = toMinorUnits(amountText, currency);
    return Number.isFinite(minor) ? minor : 0;
  }, [amountText, currency]);

  /** Participant list in a stable, user-visible order. */
  const orderedSelected = useMemo(
    () => people.filter((p) => selected.includes(p.id)).map((p) => p.id),
    [people, selected],
  );

  const participantInputs: ParticipantInput[] = useMemo(
    () =>
      orderedSelected.map((personId) => ({
        personId,
        inputValue: readInput(splitMethod, personId, { exactValues, percentValues, shareValues }, currency),
      })),
    [orderedSelected, splitMethod, exactValues, percentValues, shareValues, currency],
  );

  const validation: SplitValidation = useMemo(
    () => validateSplit(splitMethod, amount, participantInputs),
    [splitMethod, amount, participantInputs],
  );

  /** Live per-person preview — empty while the split does not yet add up. */
  const preview: ParticipantShare[] = useMemo(() => {
    if (!validation.valid || amount <= 0) return [];
    try {
      return computeSplit(splitMethod, amount, participantInputs);
    } catch {
      return [];
    }
  }, [validation.valid, amount, splitMethod, participantInputs]);

  const toggleParticipant = useCallback((personId: string) => {
    setSelected((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  }, []);

  const selectAll = useCallback(() => setSelected(people.map((p) => p.id)), [people]);
  const clearAll = useCallback(() => setSelected([]), []);

  /** Fill every selected person's exact/percentage input with an even share. */
  const distributeEvenly = useCallback(() => {
    const ids = orderedSelected;
    if (ids.length === 0) return;

    if (splitMethod === 'exact' && amount > 0) {
      const shares = computeSplit('equal', amount, ids.map((personId) => ({ personId })));
      setExactValues(
        Object.fromEntries(shares.map((s) => [s.personId, toInputString(s.amountOwed, currency)])),
      );
    } else if (splitMethod === 'percentage') {
      // Distribute 10000 basis points so the total is exactly 100.00%.
      const base = Math.floor(10_000 / ids.length);
      let remainder = 10_000 - base * ids.length;
      setPercentValues(
        Object.fromEntries(
          ids.map((id) => {
            const extra = remainder > 0 ? 1 : 0;
            remainder -= extra;
            return [id, ((base + extra) / 100).toString()];
          }),
        ),
      );
    } else if (splitMethod === 'shares') {
      setShareValues(Object.fromEntries(ids.map((id) => [id, 1])));
    }
  }, [splitMethod, amount, orderedSelected, currency]);

  return {
    amountText,
    setAmountText,
    amount,
    splitMethod,
    setSplitMethod,
    selected,
    orderedSelected,
    toggleParticipant,
    selectAll,
    clearAll,
    exactValues,
    setExactValue: (personId: string, value: string) =>
      setExactValues((current) => ({ ...current, [personId]: value })),
    percentValues,
    setPercentValue: (personId: string, value: string) =>
      setPercentValues((current) => ({ ...current, [personId]: value })),
    shareValues,
    setShareValue: (personId: string, value: number) =>
      setShareValues((current) => ({ ...current, [personId]: value })),
    participantInputs,
    validation,
    preview,
    distributeEvenly,
  };
}

export type SplitFormState = ReturnType<typeof useSplitForm>;

function readInput(
  method: SplitMethod,
  personId: string,
  values: {
    exactValues: Record<string, string>;
    percentValues: Record<string, string>;
    shareValues: Record<string, number>;
  },
  currency: string,
): number | undefined {
  switch (method) {
    case 'exact': {
      const raw = values.exactValues[personId];
      if (!raw) return 0;
      const minor = toMinorUnits(raw, currency);
      return Number.isFinite(minor) ? minor : 0;
    }
    case 'percentage': {
      const raw = values.percentValues[personId];
      if (!raw) return 0;
      const num = Number(raw);
      return Number.isFinite(num) ? num : 0;
    }
    case 'shares':
      return values.shareValues[personId] ?? 1;
    default:
      return undefined;
  }
}

function seedExact(seed: SplitFormSeed | undefined, currency: string): Record<string, string> {
  if (seed?.splitMethod !== 'exact' || !seed.participants) return {};
  return Object.fromEntries(
    seed.participants.map((p) => [p.personId, toInputString(p.amountOwed, currency)]),
  );
}

function seedPercent(seed: SplitFormSeed | undefined): Record<string, string> {
  if (seed?.splitMethod !== 'percentage' || !seed.participants) return {};
  return Object.fromEntries(
    seed.participants.map((p) => [p.personId, String(p.inputValue ?? 0)]),
  );
}

function seedShares(seed: SplitFormSeed | undefined): Record<string, number> {
  if (seed?.splitMethod !== 'shares' || !seed.participants) return {};
  return Object.fromEntries(seed.participants.map((p) => [p.personId, p.inputValue ?? 1]));
}

/** Amount text for an existing expense, in major units. */
export function amountToText(minor: number, currency: string): string {
  const major = fromMinorUnits(minor, currency);
  return Number.isInteger(major) ? String(major) : toInputString(minor, currency);
}
