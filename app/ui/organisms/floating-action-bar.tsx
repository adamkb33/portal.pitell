import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A form's action bar (ui-rules, rule 5): floats at the bottom of the screen below `lg`, always within thumb reach
 * (the bottom menu is hidden on form pages), and is an ordinary form footer from `lg`. `message` is one short line
 * that belongs with the buttons: what's missing, or a running total. Buttons share the width on phones.
 */
export function FloatingActionBar({
  message,
  children,
  className,
}: {
  message?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-floating-action-bar
      className={cn(
        'fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md overflow-hidden rounded-[var(--radius-panel)] border border-border bg-background shadow-[var(--shadow-floating)] lg:static lg:mx-0 lg:mt-4 lg:bg-transparent lg:flex lg:max-w-none lg:items-center lg:justify-end lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:border-t lg:pt-4 lg:shadow-none',
        className,
      )}
    >
      {message ? (
        <div className="border-b border-border bg-surface-variant-1 px-3 py-2 text-center text-sm text-text-secondary lg:mr-auto lg:border-0 lg:bg-transparent lg:p-0 lg:text-left">
          {message}
        </div>
      ) : null}
      <div className="grid auto-cols-fr grid-flow-col gap-2 p-2 lg:flex lg:p-0">{children}</div>
    </div>
  );
}
