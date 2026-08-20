import { SetupWizard } from '@/components/setup/SetupWizard';

/** Full-screen, no nav chrome. */
export default function SetupPage() {
  return (
    <main className="min-h-dvh bg-background">
      <SetupWizard />
    </main>
  );
}
