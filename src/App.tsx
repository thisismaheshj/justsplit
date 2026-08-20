import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { useGroupStore } from '@/store/useGroupStore';
import { HydrationGate } from '@/components/layout/HydrationGate';

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
  return (
    <HydrationGate>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <Routes>
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

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      <Toaster />
    </HydrationGate>
  );
}
