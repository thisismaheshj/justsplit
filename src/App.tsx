import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { BootSkeleton } from '@/components/layout/HydrationGate';
import { SupabaseNotice } from '@/components/auth/SupabaseNotice';
import { Button } from '@/components/ui/button';
import { isProfileComplete } from '@/lib/authValidation';
import { readLegacyGroup } from '@/lib/legacyLocal';

import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import SetupRecoveryPage from '@/pages/SetupRecoveryPage';
import ProfileSetupPage from '@/pages/ProfileSetupPage';
import SetupPage from '@/pages/SetupPage';
import NewGroupPage from '@/pages/NewGroupPage';
import DashboardPage from '@/pages/DashboardPage';
import HomePage from '@/pages/HomePage';
import PeoplePage from '@/pages/PeoplePage';
import PersonDetailPage from '@/pages/PersonDetailPage';
import ExpensesPage from '@/pages/ExpensesPage';
import ExpenseDetailPage from '@/pages/ExpenseDetailPage';
import AddExpensePage from '@/pages/AddExpensePage';
import SettleUpPage from '@/pages/SettleUpPage';
import RecurringPage from '@/pages/RecurringPage';
import SettingsPage from '@/pages/SettingsPage';

/**
 * Everything below /login requires a session. While the status is still
 * 'loading' we render nothing rather than redirecting — bouncing a returning
 * user to /login on the first frame is the auth version of the bug
 * HydrationGate already solves for the persisted group.
 */
function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'loading') return <AuthBootSkeleton />;
  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Signed-in users have no business on the sign-in screens. */
function RedirectIfAuthed() {
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return <AuthBootSkeleton />;
  if (status === 'authed') return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * A name and photo are required before anything else opens. Waits for the
 * profile read the same way RequireAuth waits for the session, so a returning
 * user with a photo is never flashed through the photo step.
 */
function RequireProfile() {
  const profileStatus = useAuthStore((s) => s.profileStatus);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const location = useLocation();

  if (profileStatus === 'idle' || profileStatus === 'loading') return <AuthBootSkeleton />;
  if (profileStatus === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-body text-muted-foreground">We couldn't load your profile. Check your connection.</p>
        <Button variant="secondary" onClick={() => void refreshProfile()}>
          Try again
        </Button>
      </main>
    );
  }
  if (!isProfileComplete(profile)) {
    return <Navigate to="/setup-profile" replace state={{ next: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

function AuthBootSkeleton() {
  return <div className="min-h-dvh bg-background" aria-busy="true" aria-live="polite" />;
}

/**
 * Loads the signed-in user's groups once, then holds the rest of the app back
 * until that first read settles. Without the wait, a returning user is bounced
 * to /setup for a frame because "no group yet" and "not loaded yet" look
 * identical -- the same trap the old localStorage gate solved.
 */
function GroupGate() {
  const userId = useAuthStore((s) => s.user?.id);
  const hydrated = useGroupStore((s) => s.hydrated);
  const bootstrap = useGroupStore((s) => s.bootstrap);
  const clearLocal = useGroupStore((s) => s.clearLocal);
  const syncAccountSeat = useGroupStore((s) => s.syncAccountSeat);
  const people = useGroupStore((s) => s.people);
  const profileName = useAuthStore((s) => s.profile?.name);
  const profilePhoto = useAuthStore((s) => s.profile?.avatarUrl);

  useEffect(() => {
    if (!userId) {
      // Signing out must not leave the previous account's ledger in memory.
      clearLocal();
      return;
    }
    void bootstrap();
  }, [userId, bootstrap, clearLocal]);

  // Your own seat always shows your current profile, including the moment
  // after you change your photo, without waiting for a group reload.
  useEffect(() => {
    if (!userId || profileName === undefined) return;
    syncAccountSeat(userId, { name: profileName, avatarPhoto: profilePhoto ?? undefined });
  }, [userId, profileName, profilePhoto, people, syncAccountSeat]);

  if (!hydrated) return <BootSkeleton />;
  return <Outlet />;
}

/** Group screens need a group open; without one, the dashboard explains what to do. */
function RequireGroup() {
  const groupId = useGroupStore((s) => s.groupId);
  if (!groupId) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/**
 * Everyone lands on the dashboard. A brand-new account is not pushed into
 * creating a group: a friend may already have added them to one, and the
 * dashboard offers "create" when there is nothing yet. The one exception is a
 * browser still holding a pre-accounts group, which /setup offers to import.
 */
function IndexRoute() {
  const groups = useGroupStore((s) => s.groups);
  const hasLegacy = groups.length === 0 && readLegacyGroup() !== null;
  return <Navigate to={hasLegacy ? '/setup' : '/dashboard'} replace />;
}

export default function App() {
  if (!isSupabaseConfigured) return <SupabaseNotice />;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Routes>
        {/* Public */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Authenticated */}
        <Route element={<RequireAuth />}>
          <Route path="/setup-profile" element={<ProfileSetupPage />} />

          <Route element={<RequireProfile />}>
            <Route path="/setup-recovery" element={<SetupRecoveryPage />} />

            <Route element={<GroupGate />}>
              <Route path="/" element={<IndexRoute />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/groups/new" element={<NewGroupPage />} />

              <Route element={<AppShell />}>
                {/* The dashboard spans every group, so it must not sit behind
                    RequireGroup -- a brand-new account has no active group yet. */}
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route element={<RequireGroup />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/people" element={<PeoplePage />} />
                  <Route path="/people/:personId" element={<PersonDetailPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/expenses/:expenseId" element={<ExpenseDetailPage />} />
                  <Route path="/add-expense" element={<AddExpensePage />} />
                  <Route path="/add-expense/:expenseId" element={<AddExpensePage />} />
                  <Route path="/settle-up" element={<SettleUpPage />} />
                  <Route path="/recurring" element={<RecurringPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </>
  );
}
