import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from './avatar';
import { Button } from './button';
import { fileToAvatarDataUrl } from '@/lib/image';

interface AvatarUploadProps {
  name: string;
  color: string;
  photo?: string;
  onChange: (photo: string | undefined) => void;
}

/** Optional avatar photo picker — falls back to initials when empty. */
export function AvatarUpload({ name, color, photo, onChange }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Avatar person={{ name: name || '?', avatarColor: color, avatarPhoto: photo }} size="lg" />
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload a photo"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setBusy(true);
            try {
              onChange(await fileToAvatarDataUrl(file));
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Could not use that image');
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera aria-hidden />
          {photo ? 'Change photo' : 'Add photo'}
        </Button>
        {photo && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            <Trash2 aria-hidden />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
