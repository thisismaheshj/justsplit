import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Info, Repeat, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section-header';
import { CurrencySelector } from './CurrencySelector';
import { CategoryManager } from './CategoryManager';
import { DataResetSection } from './DataResetSection';
import { AccountSection } from './AccountSection';

import { useGroupStore } from '@/store/useGroupStore';
import { selectActivePeople } from '@/store/selectors';
import { getCurrency } from '@/lib/currency';

export function SettingsPageContent() {
  const navigate = useNavigate();
  const store = useGroupStore();
  const group = store.group;

  const [name, setName] = useState(group?.name ?? '');
  const [nameError, setNameError] = useState<string>();
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  useEffect(() => {
    setName(group?.name ?? '');
  }, [group?.name]);

  const activePeople = selectActivePeople(store);
  const currency = getCurrency(group?.currency ?? 'USD');
  const nameDirty = name.trim() !== (group?.name ?? '');

  const saveName = () => {
    if (!name.trim()) {
      setNameError('Group name is required');
      return;
    }
    store.updateGroupName(name);
    setNameError(undefined);
    toast.success('Group name updated');
  };

  return (
    <div className="flex flex-col gap-8">
      <Section title="Account">
        <AccountSection />
      </Section>

      <Section title="Group">
        <Card className="p-5">
          <Field id="settings-group-name" label="Group name" error={nameError}>
            {(fieldProps) => (
              <div className="flex gap-2">
                <Input
                  {...fieldProps}
                  value={name}
                  maxLength={40}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError(undefined);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      saveName();
                    }
                  }}
                />
                <Button variant="secondary" disabled={!nameDirty} onClick={saveName}>
                  <Check aria-hidden />
                  Save
                </Button>
              </div>
            )}
          </Field>
        </Card>
      </Section>

      <Section title="People" description={`${activePeople.length} in this group`}>
        <Card className="divide-y divide-border overflow-hidden">
          {activePeople.slice(0, 5).map((person) => (
            <Link
              key={person.id}
              to={`/people/${person.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
            >
              <Avatar person={person} size="sm" />
              <span className="min-w-0 flex-1 truncate text-body font-medium">{person.name}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
          <Link
            to="/people"
            className="flex min-h-11 items-center justify-center gap-2 px-4 py-3 text-body font-medium text-primary transition-colors hover:bg-muted"
          >
            <Users className="size-4" aria-hidden />
            Manage people
          </Link>
        </Card>
      </Section>

      <Section title="Currency">
        <Card className="flex flex-col gap-3 p-5">
          <Field id="settings-currency" label="Display currency">
            {(fieldProps) => (
              <CurrencySelector
                id={fieldProps.id}
                value={currency.code}
                onChange={(code) => {
                  store.updateCurrency(code);
                  toast.success(`Now showing amounts in ${code}`);
                }}
              />
            )}
          </Field>
          <p className="flex gap-2 rounded-lg bg-muted p-3 text-caption text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Changing this only relabels how amounts are shown. Existing values are not converted —
            an expense recorded as 500 stays 500.
          </p>
        </Card>
      </Section>

      <Section title="Categories" description="Defaults are always available; add your own below.">
        <Card className="p-5">
          <CategoryManager />
        </Card>
      </Section>

      <Section title="Recurring">
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-body font-medium">Repeating expenses</p>
            <p className="text-caption text-muted-foreground">
              {store.recurringExpenses.filter((r) => r.active).length} active ·{' '}
              {store.recurringExpenses.length} total
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/recurring">
              <Repeat aria-hidden />
              Manage
            </Link>
          </Button>
        </Card>
      </Section>

      <Section title="Start over">
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-body font-medium">Start a new group</p>
            <p className="text-caption text-muted-foreground">
              Runs setup again. Your current group is replaced.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setNewGroupOpen(true)}>
            New group
          </Button>
        </Card>
      </Section>

      <Section title="Danger zone">
        <DataResetSection />
      </Section>

      <ConfirmDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
        title="Start a new group?"
        description="Setting up a new group replaces the current one, including all of its expenses and settlements. This can't be undone."
        confirmLabel="Continue to setup"
        destructive
        onConfirm={() => navigate('/setup')}
      />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  );
}
