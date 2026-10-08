import { Avatar, type AvatarProps } from '@/components/ui/avatar';
import { colorFromString } from '@/lib/avatar';
import { useAuthStore } from '@/store/useAuthStore';

/** The signed-in account's avatar, wherever the app shows "you". */
export function ProfileAvatar(props: Omit<AvatarProps, 'person'>) {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);

  return (
    <Avatar
      person={{
        name: profile?.name || 'You',
        // Same deterministic colour scheme group members use, keyed on the
        // account id so it stays stable across renames.
        avatarColor: colorFromString(profile?.id ?? userId ?? 'you'),
        avatarPhoto: profile?.avatarUrl ?? undefined,
      }}
      {...props}
    />
  );
}
