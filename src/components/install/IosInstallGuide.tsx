import { Share, SquarePlus } from 'lucide-react';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';

/**
 * iPhone and iPad have no install prompt a page can open, so this walks
 * through Apple's own Share → Add to Home Screen. Loaded only when opened:
 * it pulls in the dialog library, which most visits never need.
 */
export default function IosInstallGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Add JustSplit to your Home Screen</DialogTitle>
        <DialogDescription>It opens full-screen like an app, and keeps you signed in.</DialogDescription>
      </DialogHeader>

      <ol className="my-5 flex flex-col gap-4">
        <li className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
            <Share className="size-5" aria-hidden />
          </span>
          <p className="text-body">
            Tap <strong>Share</strong>: at the bottom of the screen in Safari, or at the top right in Chrome.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
            <SquarePlus className="size-5" aria-hidden />
          </span>
          <p className="text-body">
            Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </p>
        </li>
      </ol>

      <p className="text-caption text-muted-foreground">
        Opened this from WhatsApp or Instagram? Open the page in Safari first; apps' built-in browsers can't add to the
        Home Screen.
      </p>

      <DialogFooter className="mt-5">
        <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
          Got it
        </Button>
      </DialogFooter>
    </ResponsiveDialog>
  );
}
