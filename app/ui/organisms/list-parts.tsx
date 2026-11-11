import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * The parts of a list card (ui-rules → Lists and rows; reference: the Timebestillinger list). Use these instead of
 * hand-writing rows, so every list in the app has the same row height, padding, strips and empty state.
 */

export interface ListRowProps {
  /** Where the row goes. Without it the row is plain text (e.g. a past entry that can't be opened). */
  to?: string;
  title: ReactNode;
  /** One muted line under the title. */
  line?: ReactNode;
  /** Tile, time or initials before the text. */
  lead?: ReactNode;
  /** Value at the end (price, count). */
  trailing?: ReactNode;
  muted?: boolean;
}

export function ListRow({ to, title, line, lead, trailing, muted = false }: ListRowProps) {
  const body = (
    <>
      {lead}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold', muted ? 'text-text-secondary' : 'text-text-primary')}>
          {title}
        </span>
        {line ? <span className="block truncate text-sm text-text-secondary">{line}</span> : null}
      </span>
      {trailing ? <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">{trailing}</span> : null}
      {to ? <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden /> : null}
    </>
  );
  const base = 'flex h-15 items-center gap-3 px-4 sm:px-5';

  return to ? (
    <Link
      to={to}
      className={cn(
        base,
        'transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(base, muted && 'bg-surface-variant-1')}>{body}</div>
  );
}

/** The grey strip above a group of rows: label left, count right ("November 2026 · 2 tidsrom"). */
export function ListStrip({ label, count, id }: { label: ReactNode; count?: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="flex items-center justify-between gap-3 border-y border-border bg-slate-100 px-4 py-1.5 text-xs font-semibold text-text-primary sm:px-5"
    >
      <span>{label}</span>
      {count ? <span className="font-normal text-text-secondary">{count}</span> : null}
    </h3>
  );
}

/** One line in a circle-icon, at most one action; never a second create button (the + already creates). */
export function ListEmpty({
  icon: Icon,
  title,
  action,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border-t border-border px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {action}
    </div>
  );
}
