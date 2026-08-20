import { AnimatePresence, motion } from 'framer-motion';
import { Repeat } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import type { RecurringFrequency } from '@/types';

interface RecurringToggleProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  frequency: RecurringFrequency;
  onFrequencyChange: (value: RecurringFrequency) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  startDate: string;
  error?: string;
}

export function RecurringToggle({
  enabled,
  onEnabledChange,
  frequency,
  onFrequencyChange,
  endDate,
  onEndDateChange,
  startDate,
  error,
}: RecurringToggleProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="repeat-toggle" className="flex items-center gap-2">
          <Repeat className="size-4 text-muted-foreground" aria-hidden />
          Repeat this expense
        </Label>
        <Switch id="repeat-toggle" checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex flex-col gap-1.5">
                <Label id="repeat-frequency-label">How often</Label>
                <SegmentedControl
                  id="repeat-frequency"
                  label="How often"
                  value={frequency}
                  onChange={onFrequencyChange}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
              </div>

              <Field
                id="repeat-end"
                label="Stop repeating on"
                optional
                error={error}
                hint="Leave blank to keep repeating until you pause it."
              >
                {(fieldProps) => (
                  <DatePicker
                    {...fieldProps}
                    value={endDate}
                    min={startDate}
                    onChange={onEndDateChange}
                  />
                )}
              </Field>

              <p className="text-caption text-muted-foreground">
                This expense is recorded now, and the next one is created automatically when it
                falls due.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
