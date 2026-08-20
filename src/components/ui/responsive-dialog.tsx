import type { ReactNode } from 'react';
import { Dialog, DialogContent } from './dialog';
import { Sheet, SheetContent } from './sheet';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * A centred dialog on tablet and up, a bottom sheet on phones — the long forms
 * (add person, repeating expense) are far easier to reach one-handed that way.
 * Both are Radix Dialog underneath, so focus trapping and focus restore are
 * identical.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  className,
}: ResponsiveDialogProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className}>{children}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn('pt-6', className)}>
        {children}
      </SheetContent>
    </Sheet>
  );
}
