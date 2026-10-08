import { toast } from 'sonner';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { AccountSearch } from './AccountSearch';
import { useGroupStore } from '@/store/useGroupStore';

/**
 * Adds people to the open group by finding their account. Stays open so
 * several people can be added in one go; each one is excluded from the
 * results the moment they are in.
 */
export function AddPeopleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const people = useGroupStore((s) => s.people);
  const groupName = useGroupStore((s) => s.group?.name);
  const addAccount = useGroupStore((s) => s.addAccount);

  const memberUserIds = people.filter((p) => p.userId).map((p) => p.userId as string);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Add people</DialogTitle>
          <DialogDescription>
            Search for friends who have an account. {groupName ?? 'This group'} appears for them the next
            time they open the app, and they can add and edit expenses like you.
          </DialogDescription>
        </DialogHeader>

        <AccountSearch
          autoFocus
          excludeUserIds={memberUserIds}
          onSelect={(account) => {
            addAccount(account);
            toast.success(`${account.name} added to ${groupName ?? 'the group'}`);
          }}
        />

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </div>
    </ResponsiveDialog>
  );
}
