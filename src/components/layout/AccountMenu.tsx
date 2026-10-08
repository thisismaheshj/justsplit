import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LayoutGrid, LogOut, Settings, UserPen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

/**
 * "You", always one tap away: your photo in the top bar on phones and at the
 * foot of the sidebar on desktop, opening profile and sign-out.
 */
export function AccountMenu({ variant = 'avatar' }: { variant?: 'avatar' | 'sidebar' }) {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Your account"
          className={cn(
            'flex items-center rounded-full text-left transition-colors',
            variant === 'sidebar'
              ? 'w-full gap-3 rounded-lg p-2 hover:bg-muted'
              : 'size-11 justify-center',
          )}
        >
          <ProfileAvatar size={variant === 'sidebar' ? 'md' : 'sm'} className="ring-1 ring-border" />
          {variant === 'sidebar' && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium">{profile?.name || 'You'}</span>
                <span className="block truncate text-caption text-muted-foreground">{profile?.email}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={variant === 'sidebar' ? 'start' : 'end'}
          side={variant === 'sidebar' ? 'top' : 'bottom'}
          className="w-64"
        >
          <div className="flex items-center gap-3 px-2 py-2.5">
            <ProfileAvatar size="md" />
            <div className="min-w-0">
              <p className="truncate text-body font-semibold">{profile?.name || 'You'}</p>
              <p className="truncate text-caption text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <UserPen aria-hidden />
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
            <LayoutGrid aria-hidden />
            All groups
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/settings')}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => void signOut()}>
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProfileDialog open={editing} onOpenChange={setEditing} />
    </>
  );
}
