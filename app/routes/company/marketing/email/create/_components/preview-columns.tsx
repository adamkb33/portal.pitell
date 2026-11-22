import type { ReactNode } from 'react';
import { cn } from '~/ui';

/**
 * Skriv and Send: the step, with the e-mail as it will be sent beside it on desktop. On phones the preview shows under
 * the step only where `previewOnPhone` (Send); Skriv opens it full screen instead.
 */
export function PreviewColumns({
  preview,
  previewOnPhone = false,
  children,
}: {
  preview: ReactNode;
  previewOnPhone?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0 space-y-3">{children}</div>
      <aside
        aria-label="Forhåndsvisning"
        className={cn(
          'min-w-0 lg:sticky lg:top-[calc(var(--app-header-height)+1.5rem)]',
          !previewOnPhone && 'hidden lg:block',
        )}
      >
        {preview}
      </aside>
      {/* Room for the floating bar under the last thing on phones. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </div>
  );
}
