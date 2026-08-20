import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      duration={3200}
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-border bg-card text-foreground shadow-lg text-body items-start gap-2',
          description: 'text-caption text-muted-foreground',
          actionButton: 'rounded-md bg-primary text-primary-foreground text-caption',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
