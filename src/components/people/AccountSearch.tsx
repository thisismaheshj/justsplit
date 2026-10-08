import { useEffect, useState } from 'react';
import { Loader2, Plus, Search, UserX } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { searchAccounts, type AccountMatch } from '@/lib/groupsApi';
import { colorFromString } from '@/lib/avatar';
import { errorMessage } from '@/lib/utils';

interface AccountSearchProps {
  /** Accounts already chosen or already in the group; they are not offered again. */
  excludeUserIds: string[];
  onSelect: (account: AccountMatch) => void;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 250;

/**
 * Type a name, tap a person. Only people who already have an account can be
 * found, because adding someone gives *their* account access to the group.
 */
export function AccountSearch({ excludeUserIds, onSelect, autoFocus }: AccountSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AccountMatch[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchAccounts(q).then(
        (found) => {
          if (cancelled) return;
          setResults(found);
          setStatus('done');
        },
        (err: unknown) => {
          if (cancelled) return;
          setError(errorMessage(err));
          setStatus('error');
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const visible = results.filter((r) => !excludeUserIds.includes(r.userId));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Search people by name or email"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="search"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {status === 'loading' && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>

      <div aria-live="polite">
        {status === 'idle' && query.trim().length > 0 && (
          <p className="px-1 text-caption text-muted-foreground">Keep typing — at least 2 letters.</p>
        )}
        {status === 'error' && <p className="px-1 text-caption text-negative">{error}</p>}
        {status === 'done' && visible.length === 0 && (
          <div className="flex items-start gap-3 rounded-lg bg-muted px-3 py-3 text-caption text-muted-foreground">
            <UserX className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {results.length > 0
                ? 'Everyone matching is already added.'
                : `No one called "${query.trim()}" has an account yet. Ask them to sign up, then add them here.`}
            </span>
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <ul aria-label="Matching people" className="overflow-hidden rounded-lg border border-border bg-card">
          {visible.map((account) => (
            <li key={account.userId} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => onSelect(account)}
                className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted active:bg-muted"
              >
                <Avatar
                  person={{ name: account.name, avatarColor: colorFromString(account.userId), avatarPhoto: account.avatarUrl }}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{account.name}</span>
                  {account.emailHint && (
                    <span className="block truncate text-caption text-muted-foreground">{account.emailHint}</span>
                  )}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
                  <Plus className="size-4" />
                </span>
                <span className="sr-only">Add {account.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
