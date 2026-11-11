import { Link } from 'react-router';
import type { ComponentType } from 'react';
import { cn } from '../lib/cn';

export type SegmentedLink = {
  key: string;
  label: string;
  to: string;
  active: boolean;
  icon?: ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  /** A small blue count after the label (Uleste 3); left out when it's 0. */
  count?: number;
};

export interface SegmentedLinksProps {
  /** Names the group for screen readers, e.g. "Bytt mellom bookbar tid og fravær". */
  label: string;
  items: SegmentedLink[];
  className?: string;
}

/**
 * The segmented control, for choices that change the URL (area switch, Kommende | Tidligere). Links with
 * `aria-current`, not tabs or buttons: each segment is a place you go to. Equal-width segments, active one tinted blue.
 */
export function SegmentedLinks({ label, items, className }: SegmentedLinksProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'grid gap-1 rounded-[var(--radius-control)] border border-border bg-background p-1 sm:inline-grid',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ key, label: itemLabel, to, active, icon: Icon, count }) => (
        <Link
          key={key}
          to={to}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
            active
              ? 'bg-blue-50 text-interactive'
              : 'text-text-secondary hover:bg-surface-variant-1 hover:text-text-primary',
          )}
        >
          {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.7} aria-hidden /> : null}
          {itemLabel}
          {count ? (
            <span className="min-w-5 rounded-full bg-interactive px-1.5 text-xs leading-5 font-semibold text-text-inverse tabular-nums">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
