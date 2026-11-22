import type { ComponentProps, ReactNode } from 'react';
import { cn } from '~/ui';

/** A finished choice, like Ny time's: what was chosen, with "Endre" to change it. */
export function ChosenRow({
  lead,
  value,
  label,
  children,
}: {
  lead: ReactNode;
  value: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-background py-0.5 pr-2 pl-3.5 text-sm"
    >
      {lead}
      <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{value}</span>
      {children}
    </section>
  );
}

/** "Endre" at the end of a row; `label` says what it changes ("Endre mal"). Works as a menu trigger too. */
export function EditButton({ label, className, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'grid h-11 shrink-0 place-items-center rounded-[var(--radius-control)] px-2 text-sm font-semibold text-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive disabled:text-text-disabled',
        className,
      )}
      {...props}
    >
      Endre
    </button>
  );
}
