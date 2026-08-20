import { SegmentedControl } from '@/components/ui/segmented-control';
import type { SplitMethod } from '@/types';

const OPTIONS = [
  { value: 'equal' as const, label: 'Equal' },
  { value: 'exact' as const, label: 'Exact' },
  { value: 'percentage' as const, label: '%' },
  { value: 'shares' as const, label: 'Shares' },
];

export function SplitMethodTabs({
  value,
  onChange,
}: {
  value: SplitMethod;
  onChange: (value: SplitMethod) => void;
}) {
  return (
    <SegmentedControl
      id="split-method"
      label="Split method"
      value={value}
      onChange={onChange}
      options={OPTIONS}
    />
  );
}
