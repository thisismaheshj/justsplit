import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGroupStore } from '@/store/useGroupStore';

/** Danger zone: demo data loading and the irreversible reset. */
export function DataResetSection() {
  const navigate = useNavigate();
  const group = useGroupStore((s) => s.group);
  const resetAll = useGroupStore((s) => s.resetAll);
  const loadSeedData = useGroupStore((s) => s.loadSeedData);

  const [resetOpen, setResetOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const groupName = group?.name ?? '';
  const canReset = confirmText.trim() === groupName.trim() && groupName.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-body font-medium">Load demo data</p>
          <p className="text-caption text-muted-foreground">
            Replaces everything with a sample “Goa Trip” group — handy for a quick look around.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setSeedOpen(true)}>
          <Sparkles aria-hidden />
          Load demo
        </Button>
      </Card>

      <Card className="border-negative/30 bg-negative-soft/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-body font-medium text-negative">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              Delete group data
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Wipes every person, expense, settlement and repeating template stored on this device.
            </p>
          </div>
          <Button variant="secondary" size="sm" className="text-negative" onClick={() => setResetOpen(true)}>
            <RotateCcw aria-hidden />
            Reset everything
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={seedOpen}
        onOpenChange={setSeedOpen}
        title="Load demo data?"
        description="Your current group and all of its expenses will be replaced by the sample data. This can't be undone."
        confirmLabel="Load demo data"
        destructive
        onConfirm={() => {
          loadSeedData();
          toast.success('Demo group loaded');
          navigate('/home');
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) setConfirmText('');
        }}
        title="Delete everything?"
        description={
          <span>
            This permanently removes all data for <strong>{groupName}</strong> from this browser.
            There is no backup and this can't be undone.
          </span>
        }
        confirmLabel="Delete all data"
        destructive
        confirmDisabled={!canReset}
        onConfirm={() => {
          resetAll();
          setConfirmText('');
          toast.success('All data deleted');
          navigate('/setup', { replace: true });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-group-name">
            Type <span className="font-semibold">{groupName}</span> to confirm
          </Label>
          <Input
            id="confirm-group-name"
            value={confirmText}
            autoComplete="off"
            placeholder={groupName}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
