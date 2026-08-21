import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { SupabaseNotice } from '@/components/auth/SupabaseNotice';

import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import SetupPage from '@/pages/SetupPage';
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

function AuthBootSkeleton() {
  return <div className="min-h-dvh bg-background" aria-busy="true" aria-live="polite" />;
}

/** Any route but /setup requires an initialised group. */
function RequireGroup() {
  const group = useGroupStore((s) => s.group);
  if (!group) return <Navigate to="/setup" replace />;
  return <Outlet />;
}

/** The index route decides between first-run setup and the dashboard. */
function IndexRoute() {
  const group = useGroupStore((s) => s.group);
  return <Navigate to={group ? '/home' : '/setup'} replace />;
}

export default function App() {
  if (!isSupabaseConfigured) return <SupabaseNotice />;

  return (
    <HydrationGate>
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
          <Route path="/" element={<IndexRoute />} />
          <Route path="/setup" element={<SetupPage />} />

          <Route element={<RequireGroup />}>
            <Route element={<AppShell />}>
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </HydrationGate>
  );
}
