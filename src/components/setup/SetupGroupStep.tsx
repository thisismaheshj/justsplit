import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CurrencySelector } from '@/components/settings/CurrencySelector';

interface SetupGroupStepProps {
  name: string;
  currency: string;
  onNameChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  error?: string;
}

export function SetupGroupStep({
  name,
  currency,
  onNameChange,
  onCurrencyChange,
  error,
}: SetupGroupStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field id="group-name" label="Group or trip name" error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={name}
            autoFocus
            maxLength={40}
            placeholder="Goa Trip, Flat 402, Ski weekend…"
            onChange={(event) => onNameChange(event.target.value)}
          />
        )}
      </Field>

      <Field
        id="group-currency"
        label="Currency"
        hint="Used to format every amount. You can change it later in Settings."
      >
        {(fieldProps) => (
          <CurrencySelector id={fieldProps.id} value={currency} onChange={onCurrencyChange} />
        )}
      </Field>
    </div>
  );
}
