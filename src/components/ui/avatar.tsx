import * as React from 'react';
import { cn } from '@/lib/utils';
import { contrastText, generateInitials } from '@/lib/avatar';
import type { Person } from '@/types';

const SIZES = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-caption',
  md: 'size-10 text-body',
  lg: 'size-14 text-section',
  xl: 'size-20 text-page',
  '2xl': 'size-28 text-page',
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  person: Pick<Person, 'name' | 'avatarColor' | 'avatarPhoto'>;
  size?: keyof typeof SIZES;
}

export function Avatar({ person, size = 'md', className, ...props }: AvatarProps) {
  const initials = generateInitials(person.name);
  // A photo URL can go stale (a revoked Google picture, a bad upload); fall
  // back to initials instead of a broken-image glyph.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const photo = person.avatarPhoto && person.avatarPhoto !== failedSrc ? person.avatarPhoto : undefined;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        SIZES[size],
        className,
      )}
      style={
        photo
          ? undefined
          : { backgroundColor: person.avatarColor, color: contrastText(person.avatarColor) }
      }
      {...props}
    >
      {photo ? (
        <img
          src={photo}
          alt={person.name}
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(photo)}
          className="size-full bg-muted object-cover"
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}

/** Overlapping avatar row used to show participants compactly. */
export function AvatarStack({
  people,
  max = 4,
  size = 'xs',
}: {
  people: Pick<Person, 'id' | 'name' | 'avatarColor' | 'avatarPhoto'>[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;

  return (
    <span className="flex items-center">
      {shown.map((person) => (
        <Avatar
          key={person.id}
          person={person}
          size={size}
          className="-ml-1.5 ring-2 ring-card first:ml-0"
        />
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 inline-flex size-6 items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold text-muted-foreground ring-2 ring-card">
          +{extra}
        </span>
      )}
    </span>
  );
}
