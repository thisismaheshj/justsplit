import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { colorFromString } from '@/lib/avatar';

export interface DraftPerson {
  key: string;
  name: string;
  avatarPhoto?: string;
  /** The signed-in account's own seat: shown from the profile, not editable here. */
  self?: boolean;
}

interface SetupPeopleStepProps {
  people: DraftPerson[];
  onChange: (people: DraftPerson[]) => void;
}

export function SetupPeopleStep({ people, onChange }: SetupPeopleStepProps) {
  const update = (key: string, patch: Partial<DraftPerson>) =>
    onChange(people.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const duplicateNames = new Set(
    people
      .map((p) => p.name.trim().toLowerCase())
      .filter((name, index, all) => name && all.indexOf(name) !== index),
  );

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {people.map((person, index) => {
          const isDuplicate = duplicateNames.has(person.name.trim().toLowerCase());
          return (
            <motion.div
              key={person.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {person.self ? (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <Avatar
                    person={{ name: person.name || 'You', avatarColor: colorFromString(person.key), avatarPhoto: person.avatarPhoto }}
                    size="lg"
                  />
                  <span className="min-w-0 flex-1 truncate text-label font-semibold">{person.name || 'You'}</span>
                  <Badge variant="primary">You</Badge>
                </div>
              ) : (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <AvatarUpload
                    name={person.name}
                    color={colorFromString(person.key)}
                    photo={person.avatarPhoto}
                    onChange={(avatarPhoto) => update(person.key, { avatarPhoto })}
                  />
                  <div className="flex-1">
                    <Field id={`person-${person.key}`} label={`Person ${index + 1}`}>
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          value={person.name}
                          autoFocus={index === 1}
                          placeholder="Name"
                          maxLength={40}
                          autoComplete="off"
                          onChange={(event) => update(person.key, { name: event.target.value })}
                        />
                      )}
                    </Field>
                    {isDuplicate && (
                      <p className="mt-1.5 flex items-center gap-1 text-caption text-muted-foreground">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                        Another person has this name — that's fine, they stay separate.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
