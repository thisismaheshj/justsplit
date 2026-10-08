import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { useGroupStore } from '@/store/useGroupStore';
import { validatePerson } from '@/lib/validation';
import { isValidEmail } from '@/lib/authValidation';
import type { Person } from '@/types';

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * A person without an account -- only imported groups have these now, since
   * new people are added by finding their account.
   */
  person: Person;
}

export function PersonFormDialog({ open, onOpenChange, person }: PersonFormDialogProps) {
  const updatePerson = useGroupStore((s) => s.updatePerson);
  const people = useGroupStore((s) => s.people);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setName(person.name);
    setPhoto(person.avatarPhoto);
    setEmail(person.inviteEmail ?? '');
    setError(undefined);
    setEmailError(undefined);
  }, [open, person]);

  const duplicate =
    name.trim().length > 0 &&
    people.some(
      (p) => p.id !== person.id && p.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePerson({ name });
    const trimmedEmail = email.trim();
    const badEmail = trimmedEmail && !isValidEmail(trimmedEmail) ? 'Enter a valid email' : undefined;
    setError(validation.errors.name);
    setEmailError(badEmail);
    if (!validation.valid || badEmail) return;

    updatePerson(person.id, { name, avatarPhoto: photo, inviteEmail: trimmedEmail || undefined });
    toast.success('Person updated');
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit person</DialogTitle>
            <DialogDescription>
              Change their name, photo or email. Their expense history stays as it is.
            </DialogDescription>
          </DialogHeader>

          <AvatarUpload
            name={name}
            color={person.avatarColor}
            photo={photo}
            onChange={setPhoto}
          />

          <Field id="person-name" label="Name" error={error}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={name}
                autoFocus
                maxLength={40}
                autoComplete="off"
                placeholder="e.g. Priya"
                onChange={(event) => {
                  setName(event.target.value);
                  setError(undefined);
                }}
              />
            )}
          </Field>

          <Field
            id="person-email"
            label="Email"
            optional
            error={emailError}
            hint={`When ${name.trim() || 'they'} sign${name.trim() ? 's' : ''} up with this email, the account takes over this person and everything recorded so far.`}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="off"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError(undefined);
                }}
              />
            )}
          </Field>

          {duplicate && !error && (
            <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              Someone in this group already has that name. They will stay separate people.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
    </ResponsiveDialog>
  );
}
