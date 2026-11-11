import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '~/ui';

/** Full-colour gradients for key destinations; white text stays ≥ 5.3:1 across the gradient. */
export const KEY_TONES = {
  teal: 'from-category-teal-ink to-category-teal-deep border-category-teal-deep',
  cyan: 'from-category-cyan-ink to-category-cyan-deep border-category-cyan-deep',
  /** Varsler on the company Oversikt: the app's own blue (white text 6.6:1 and up). */
  blue: 'from-interactive to-interactive-hover border-interactive-hover',
} as const;

/**
 * A domain's key destination on its Oversikt (ui-rules → Page types, Oversikt): a full-colour card with the area's
 * icon, its name and one live number, e.g. Kalender "4 avtaler i dag". Two at most per domain, side by side; the
 * other areas stay as rows below. Approved sketch 2026-11-10 (B2).
 */
export function KeyDestinationCard({
  href,
  label,
  icon: Icon,
  tone,
  count,
  countLabel,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: keyof typeof KEY_TONES;
  /** Null when the number couldn't be loaded: the card still opens the area. */
  count: number | null;
  countLabel: string;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'relative isolate flex min-h-34 flex-col justify-between overflow-hidden rounded-2xl border bg-linear-150 p-3.5 text-text-inverse transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive sm:min-h-40 sm:p-5',
        KEY_TONES[tone],
      )}
    >
      <span aria-hidden className="absolute -top-12 -right-10 -z-10 size-32 rounded-full bg-on-brand-decoration" />
      <Icon
        aria-hidden
        className="absolute -right-3.5 -bottom-4.5 -z-10 size-23 text-on-brand-decoration sm:size-30"
        strokeWidth={1.5}
      />
      <span className="flex items-start justify-between">
        <span aria-hidden className="grid size-9 place-items-center rounded-[10px] bg-on-colour-soft">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <ChevronRight aria-hidden className="size-4.5 text-on-colour-muted" />
      </span>
      <span>
        <span className="block font-display text-[17px] font-bold leading-tight">{label}</span>
        <span className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-display text-[28px] font-bold leading-none tabular-nums sm:text-[34px]">
            {count ?? '–'}
          </span>
          <span className="text-[13px] text-on-colour-muted">{countLabel}</span>
        </span>
      </span>
    </Link>
  );
}
