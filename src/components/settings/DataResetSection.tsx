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
import { errorMessage } from '@/lib/utils';

/** Danger zone: demo data and deleting a group for good. */
export function DataResetSection() {
  const navigate = useNavigate();
  const group = useGroupStore((s) => s.group);
  const deleteActiveGroup = useGroupStore((s) => s.deleteActiveGroup);
  const loadDemoData = useGroupStore((s) => s.loadDemoData);

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
Adds a sample “Goa Trip” group alongside your own — handy for a quick look around.
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
  Permanently deletes this group and everything in it, for every member.
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
        description="A sample group is added to your account. Nothing you already have is touched."
        confirmLabel="Load demo data"
        onConfirm={() => {
          void loadDemoData()
            .then(() => {
              toast.success('Demo group added');
              navigate('/home');
            })
            .catch((error: unknown) =>
              toast.error('Could not add the demo group', {
                description: errorMessage(error),
              }),
            );
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
            This permanently deletes <strong>{groupName}</strong> and every expense, settlement
            and repeating template in it, for everyone in the group. This can't be undone.
          </span>
        }
        confirmLabel="Delete all data"
        destructive
        confirmDisabled={!canReset}
        onConfirm={() => {
          void deleteActiveGroup()
            .then(() => {
              setConfirmText('');
              toast.success('Group deleted');
              navigate('/', { replace: true });
            })
            .catch((error: unknown) =>
              toast.error('Could not delete that group', {
                description: errorMessage(error),
              }),
            );
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
