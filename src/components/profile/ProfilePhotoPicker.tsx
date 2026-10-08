import { useRef, useState } from 'react';
import { Camera, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { fileToAvatarDataUrl, PROFILE_PHOTO_DIMENSION } from '@/lib/image';
import { cn } from '@/lib/utils';

interface ProfilePhotoPickerProps {
  name: string;
  color: string;
  photo: string | null;
  onChange: (photo: string) => void;
  /** Ties the picker to a validation message via aria-describedby. */
  errorId?: string;
  invalid?: boolean;
}

/**
 * One big tap target. On a phone, `accept="image/*"` lets the OS offer both
 * the camera and the photo library, so there is no need for two buttons.
 * There is deliberately no "remove": an account always has a photo.
 */
export function ProfilePhotoPicker({ name, color, photo, onChange, errorId, invalid }: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToAvatarDataUrl(file, PROFILE_PHOTO_DIMENSION));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not use that image');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void onFile(file);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={photo ? 'Change your photo' : 'Add your photo'}
        aria-describedby={errorId}
        aria-invalid={invalid || undefined}
        className="group relative rounded-full"
      >
        {photo ? (
          <Avatar person={{ name: name || '?', avatarColor: color, avatarPhoto: photo }} size="2xl" />
        ) : (
          <span
            className={cn(
              'flex size-28 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed bg-card text-muted-foreground transition-colors',
              'group-hover:border-primary group-hover:text-primary',
              invalid ? 'border-negative text-negative' : 'border-border-strong',
            )}
          >
            <Camera className="size-7" aria-hidden />
          </span>
        )}

        <span
          className="absolute bottom-0.5 right-0.5 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background transition-transform group-active:scale-95"
          aria-hidden
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : photo ? <Camera className="size-4" /> : <Plus className="size-5" />}
        </span>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="text-body font-medium text-primary underline-offset-4 hover:underline"
      >
        {photo ? 'Change photo' : 'Choose a photo'}
      </button>
    </div>
  );
}
