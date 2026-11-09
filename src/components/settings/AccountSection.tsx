import { useState } from 'react';
import { Camera, LogOut } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';

export function AccountSection() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [editingProfile, setEditingProfile] = useState(false);

  const providerNames: Record<string, string> = { google: 'Google', email: 'email' };
  const providers = (user?.identities ?? []).map((i) => providerNames[i.provider] ?? i.provider);

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            aria-label="Change your photo"
            className="relative shrink-0 rounded-full"
          >
            <ProfileAvatar size="xl" />
            <span
              className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-card"
              aria-hidden
            >
              <Camera className="size-3.5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-section font-semibold">{profile?.name || 'You'}</p>
            <p className="truncate text-body text-muted-foreground">{profile?.email}</p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Signs in with {providers.length ? providers.join(' and ') : 'this device'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="min-h-12 text-body font-medium text-primary transition-colors hover:bg-muted active:bg-muted"
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-12 items-center justify-center gap-2 text-body font-medium text-negative transition-colors hover:bg-negative-soft active:bg-negative-soft"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </Card>

      <EditProfileDialog open={editingProfile} onOpenChange={setEditingProfile} />
    </div>
  );
}
