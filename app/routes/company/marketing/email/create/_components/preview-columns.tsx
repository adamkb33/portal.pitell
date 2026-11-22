import type { ReactNode } from 'react';

/**
 * Skriv and Send: the step, with the e-mail as it will be sent beside it on desktop. On phones the step opens the
 * preview full screen ("Forhåndsvis") instead.
 */
export function PreviewColumns({ preview, children }: { preview: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-6">
      <div className="min-w-0 space-y-3">{children}</div>
      <aside
        aria-label="Forhåndsvisning"
        className="hidden min-w-0 lg:sticky lg:top-[calc(var(--app-header-height)+1.5rem)] lg:block"
      >
        {preview}
      </aside>
      {/* Room for the floating bar under the last thing on phones. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </div>
  );
}
