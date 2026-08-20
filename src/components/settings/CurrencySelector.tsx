import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/currency';

interface CurrencySelectorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  'aria-describedby'?: string;
}

export function CurrencySelector({ id, value, onChange, ...rest }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label="Currency" {...rest}>
        <SelectValue placeholder="Choose a currency" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.symbol} {currency.code} — {currency.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
