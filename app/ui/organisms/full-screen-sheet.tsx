import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '../primitives/sheet';

/**
 * A focused task on top of the page (Material: full-screen dialog on phones, side sheet on large screens): the whole
 * screen on phones, a panel from the right from `sm`. ✕ closes it (so do Escape and the browser's back gesture via
 * the dialog), the content scrolls, and an optional footer holds the one action. Never open another sheet from one.
 */
export function FullScreenSheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="inset-0 top-0 h-dvh gap-0 border-0 p-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md sm:border-l sm:border-border sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right"
      >
        <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-1.5">
          <SheetClose
            aria-label="Lukk"
            className="grid size-11 place-items-center rounded-[var(--radius-control)] text-text-secondary transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive"
          >
            <X className="size-5" aria-hidden />
          </SheetClose>
          <SheetTitle className="font-display text-[17px] font-semibold text-text-primary">{title}</SheetTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
