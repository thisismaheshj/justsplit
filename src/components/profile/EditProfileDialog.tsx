import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ProfilePhotoPicker } from './ProfilePhotoPicker';
import { useAuthStore } from '@/store/useAuthStore';
import { colorFromString } from '@/lib/avatar';
import { validateProfile, type ProfileField } from '@/lib/authValidation';
import type { FieldErrors } from '@/lib/validation';

export function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const saveProfile = useAuthStore((s) => s.saveProfile);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(profile?.name ?? '');
    setPhoto(profile?.avatarUrl ?? null);
    setErrors({});
  }, [open, profile]);

  const dirty = name.trim() !== (profile?.name ?? '') || photo !== (profile?.avatarUrl ?? null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateProfile({ name, photo });
    setErrors(result.errors);
    if (!result.valid || !photo) return;

    setBusy(true);
    const error = await saveProfile({ name, avatarUrl: photo });
    setBusy(false);
    if (error) return void toast.error(error);
    toast.success('Profile updated');
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Your name and photo update in every group you're part of.</DialogDescription>
        </DialogHeader>

        <ProfilePhotoPicker
          name={name}
          color={colorFromString(userId ?? 'you')}
          photo={photo}
          onChange={setPhoto}
        />

        <Field id="profile-name" label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              maxLength={40}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
          )}
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!dirty}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </ResponsiveDialog>
  );
}
