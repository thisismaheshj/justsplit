import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthCard } from '@/components/auth/AuthCard';
import { ProfilePhotoPicker } from '@/components/profile/ProfilePhotoPicker';
import { useAuthStore } from '@/store/useAuthStore';
import { colorFromString } from '@/lib/avatar';
import { validateProfile, type ProfileField } from '@/lib/authValidation';
import type { FieldErrors } from '@/lib/validation';

interface ProfileSetupState {
  /** Where to go once the profile is complete. */
  next?: string;
  /** True when arriving straight from sign-up, to show flow progress. */
  onboarding?: boolean;
}

/**
 * Every account needs a name and a photo before the app opens: the photo is
 * how fellow group members tell people apart. New sign-ups land here first;
 * RequireProfile sends any existing account without a photo here too.
 */
export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ProfileSetupState | null) ?? {};

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const saveProfile = useAuthStore((s) => s.saveProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const [name, setName] = useState(profile?.name ?? '');
  const [photo, setPhoto] = useState<string | null>(profile?.avatarUrl ?? null);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The profile may arrive after first render; prefill without clobbering
  // anything the user has already typed or picked.
  useEffect(() => {
    if (!profile) return;
    setName((current) => current || profile.name);
    setPhoto((current) => current ?? profile.avatarUrl);
  }, [profile]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateProfile({ name, photo });
    setErrors(result.errors);
    if (!result.valid || !photo) return;

    setBusy(true);
    setFormError(null);
    const error = await saveProfile({ name, avatarUrl: photo });
    setBusy(false);
    if (error) {
      setFormError(error);
      return;
    }
    navigate(state.next ?? '/', { replace: true, state: { onboarding: state.onboarding } });
  }

  const firstName = name.trim().split(/\s+/)[0];

  return (
    <AuthCard
      title={photo && firstName ? `Looking good, ${firstName}` : 'Add your photo'}
      subtitle="Your photo appears next to your name in every group, so friends know it's you."
      step={state.onboarding ? { current: 2, total: 3 } : undefined}
      error={formError}
      footer={
        <button
          type="button"
          className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => void signOut()}
        >
          Not you? Sign out
        </button>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <ProfilePhotoPicker
            name={name}
            color={colorFromString(user?.id ?? 'you')}
            photo={photo}
            onChange={(next) => {
              setPhoto(next);
              setErrors((prev) => ({ ...prev, photo: undefined }));
            }}
            errorId={errors.photo ? 'photo-error' : undefined}
            invalid={Boolean(errors.photo)}
          />
          {errors.photo && (
            <p id="photo-error" role="alert" className="text-caption text-negative">
              {errors.photo}
            </p>
          )}
        </div>

        <Field id="name" label="Your name" error={errors.name} hint="This is how you'll appear to others.">
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              maxLength={40}
              placeholder="Your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Continue
        </Button>
      </form>
    </AuthCard>
  );
}
