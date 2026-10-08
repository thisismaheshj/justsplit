import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';

import { OverallBalance } from './OverallBalance';
import { GroupCard } from './GroupCard';
import { ActivityFeed } from './ActivityFeed';

import {
  fetchDashboardActivity,
  fetchDashboardGroups,
  totalsByCurrency,
  type ActivityEntry,
  type DashboardGroup,
} from '@/lib/dashboardApi';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupStore } from '@/store/useGroupStore';

export function DashboardView() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const selectGroup = useGroupStore((s) => s.selectGroup);

  const [groups, setGroups] = useState<DashboardGroup[] | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [g, a] = await Promise.all([fetchDashboardGroups(), fetchDashboardActivity(10)]);
        if (cancelled) return;
        setGroups(g);
        setActivity(a);
      } catch (error) {
        if (cancelled) return;
        setGroups([]);
        toast.error('Could not load your dashboard', {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Opening anything from here switches the active group before navigating. */
  const openGroup = useCallback(
    (groupId: string) => {
      void selectGroup(groupId).then(() => navigate('/home'));
    },
    [selectGroup, navigate],
  );

  const firstName = profile?.name?.trim().split(/\s+/)[0];

  if (groups === null) return <DashboardSkeleton />;

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid />}
        title="No groups yet"
        description="Create a trip or a household and start splitting. Everything you add shows up here."
        action={
          <Button asChild>
            <Link to="/groups/new">
              <Plus aria-hidden />
              Create your first group
            </Link>
          </Button>
        }
      />
    );
  }

  const totals = totalsByCurrency(groups);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <ProfileAvatar size="lg" className="ring-2 ring-card" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-page font-semibold">
            {firstName ? `Hello, ${firstName}` : 'Overview'}
          </h2>
          <p className="text-body text-muted-foreground">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'} across your account
          </p>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0">
          <Link to="/groups/new">
            <Plus aria-hidden />
            <span className="hidden sm:inline">New group</span>
            <span className="sm:hidden">New</span>
          </Link>
        </Button>
      </div>

      <OverallBalance totals={totals} />

      <section className="flex flex-col gap-3">
        <SectionHeader title="Your groups" description="Open one to add expenses or settle up." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.groupId} group={group} onOpen={openGroup} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Recent activity" description="Across every group, newest first." />
        {activity.length > 0 ? (
          <ActivityFeed entries={activity} onOpenGroup={openGroup} />
        ) : (
          <Card className="px-4 py-8 text-center text-body text-muted-foreground">
            Nothing recorded yet. Open a group and add your first expense.
          </Card>
        )}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
