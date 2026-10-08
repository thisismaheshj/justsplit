import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { useRecurringCheck } from '@/hooks/useRecurringCheck';

/**
 * Nav chrome for every route except the full-screen setup flow.
 * Sidebar at >= 768px, bottom nav below it — both are always rendered and
 * toggled with CSS so a resize never remounts the page.
 */
export function AppShell() {
  const location = useLocation();
  useRecurringCheck();

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />

      <div className="md:pl-64">
        <TopBar />
        <main
          id="main"
          className="mx-auto w-full max-w-[1200px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:pb-12 md:pt-6"
        >
          {/* Keyed on the path so each page fades and slides in on its own.
              Enter-only: a `mode="wait"` exit would have to wait on every
              nested AnimatePresence inside the outgoing page. */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
