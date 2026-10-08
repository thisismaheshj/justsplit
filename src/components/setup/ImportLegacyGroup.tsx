import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, HardDriveDownload } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';
import { dismissLegacyGroup, type LegacySnapshot } from '@/lib/legacyLocal';
import { importLocalGroup } from '@/lib/groupsApi';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupStore } from '@/store/useGroupStore';
import { cn, errorMessage } from '@/lib/utils';

/**
 * Before accounts existed, a group lived only in this browser. That data is
 * still sitting in localStorage and is not backed up anywhere, so it gets an
 * explicit offer to move it into the account rather than being quietly
 * stranded behind a login screen.
 */
export function ImportLegacyGroup({
  snapshot,
  onDismiss,
}: {
  snapshot: LegacySnapshot;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const selectGroup = useGroupStore((s) => s.selectGroup);
  const refreshGroups = useGroupStore((s) => s.bootstrap);

  const { state, expenseCount } = snapshot;
  const currency = state.group?.currency ?? 'INR';
  const total = state.expenses.reduce((sum, e) => sum + e.amount, 0);

  const [claimId, setClaimId] = useState<string>(state.people[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  async function runImport() {
    setBusy(true);
    try {
      const groupId = await importLocalGroup(state, {
        claimPersonId: claimId || undefined,
        ownerName: profile?.name,
      });
      dismissLegacyGroup();
      await refreshGroups();
      await selectGroup(groupId);
      toast.success(`${state.group?.name} imported`, {
        description: `${expenseCount} ${expenseCount === 1 ? 'expense' : 'expenses'} carried over.`,
      });
      navigate('/home', { replace: true });
    } catch (error) {
      setBusy(false);
      toast.error('Could not import that group', {
        description: errorMessage(error),
      });
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
          aria-hidden
        >
          <HardDriveDownload className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-section font-semibold">
            Bring “{state.group?.name}” with you
          </h2>
          <p className="mt-0.5 text-body text-muted-foreground">
            This group is saved on this device from before you had an account —{' '}
            {state.people.length} {state.people.length === 1 ? 'person' : 'people'},{' '}
            {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'},{' '}
            {formatCurrency(total, currency)} in total. Move it into your account so it is not
            lost when this browser is cleared.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label id="claim-label">Which one is you?</Label>
        <p className="text-caption text-muted-foreground">
          Your own expenses stay attached to your account. Everyone else comes across as a member
          without a login.
        </p>
        <div role="radiogroup" aria-labelledby="claim-label" className="flex flex-wrap gap-2">
          {state.people.map((person) => {
            const selected = person.id === claimId;
            return (
              <button
                key={person.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setClaimId(person.id)}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-body font-medium transition-colors',
                  selected
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                <Avatar person={person} size="xs" />
                {person.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button loading={busy} onClick={() => void runImport()}>
          <Download aria-hidden />
          Import this group
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            // The data itself is left in localStorage; only the prompt is
            // silenced, so a change of mind is still recoverable.
            dismissLegacyGroup();
            onDismiss();
          }}
        >
          Start fresh instead
        </Button>
      </div>
    </Card>
  );
}
