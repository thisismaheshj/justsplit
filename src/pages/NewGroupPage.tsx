import { SetupWizard } from '@/components/setup/SetupWizard';

/**
 * Creating an additional group. Same wizard as first-run, but on its own route
 * so it is never shadowed by the legacy-import prompt that /setup shows.
 */
export default function NewGroupPage() {
  return (
    <main className="min-h-dvh bg-background">
      <SetupWizard />
    </main>
  );
}
