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
import { colorFromString } from '@/lib/avatar';
import { isValidEmail } from '@/lib/authValidation';
import type { Person } from '@/types';

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing person. */
  person?: Person;
}

export function PersonFormDialog({ open, onOpenChange, person }: PersonFormDialogProps) {
  const addPerson = useGroupStore((s) => s.addPerson);
  const updatePerson = useGroupStore((s) => s.updatePerson);
  const people = useGroupStore((s) => s.people);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setName(person?.name ?? '');
    setPhoto(person?.avatarPhoto);
    setEmail(person?.inviteEmail ?? '');
    setError(undefined);
    setEmailError(undefined);
  }, [open, person]);

  const duplicate =
    name.trim().length > 0 &&
    people.some(
      (p) => p.id !== person?.id && p.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePerson({ name });
    const trimmedEmail = email.trim();
    const badEmail = trimmedEmail && !isValidEmail(trimmedEmail) ? 'Enter a valid email' : undefined;
    setError(validation.errors.name);
    setEmailError(badEmail);
    if (!validation.valid || badEmail) return;

    if (person) {
      updatePerson(person.id, { name, avatarPhoto: photo, inviteEmail: trimmedEmail || undefined });
      toast.success('Person updated');
    } else {
      addPerson(name, photo, trimmedEmail || undefined);
      toast.success(`${name.trim()} added to the group`);
    }
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{person ? 'Edit person' : 'Add a person'}</DialogTitle>
            <DialogDescription>
              {person
                ? 'Change their name, photo or email. Their expense history stays as it is.'
                : 'They will be included in new expenses by default.'}
            </DialogDescription>
          </DialogHeader>

          <AvatarUpload
            name={name}
            color={person?.avatarColor ?? colorFromString(name || 'new')}
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
            <Button type="submit">{person ? 'Save changes' : 'Add person'}</Button>
          </DialogFooter>
        </form>
    </ResponsiveDialog>
  );
}
