import { useState } from 'react';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { ImportLegacyGroup } from '@/components/setup/ImportLegacyGroup';
import { readLegacyGroup } from '@/lib/legacyLocal';

/** Full-screen, no nav chrome. */
export default function SetupPage() {
  // Read once on mount: the answer cannot change while this screen is open.
  const [legacy, setLegacy] = useState(() => readLegacyGroup());

  return (
    <main className="min-h-dvh bg-background">
      {legacy ? (
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <ImportLegacyGroup snapshot={legacy} onDismiss={() => setLegacy(null)} />
        </div>
      ) : (
        <SetupWizard />
      )}
    </main>
  );
}
