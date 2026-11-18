import type { ComponentType, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../atoms/button';
import { cn } from '../lib/cn';

/**
 * The list standard (ui-rules → Lists and rows; decided 2026-11-18 from Apple HIG, Material, Android edge-to-edge,
 * NN/g and Baymard). Use these parts instead of hand-writing lists, so every list has the same surface, rows, strips,
 * empty state and footer:
 *
 *   <ListCard label="Kampanjer">
 *     <ListToolbar>switch or search</ListToolbar>      (optional)
 *     <ListBody>
 *       <section aria-label="November 2026"><ListStrip … /><ListRows><li><ListRow … /></li></ListRows></section>
 *       or <ListEmpty … />
 *     </ListBody>
 *     <ListFooter … />                                (count and pages)
 *   </ListCard>
 *
 * Phones (below `sm`): the list runs edge to edge, without a card, side margin or rounded corners; the toolbar sits
 * on the page above it, the footer in a quiet line under it, and group strips stay under the header while their
 * group scrolls past. From `sm`: one card holding all of it. Rows are 56px with two lines, 48px with one, and the
 * line between rows starts at the text.
 */

export function ListCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section
      aria-label={label}
      className={cn(
        // Phones: out to the screen edges (cancels the page's 12px side gutter).
        'flex min-w-0 flex-col max-sm:-mx-3 max-sm:[&>[data-list-footer]]:border-t-0',
        'sm:overflow-hidden sm:rounded-xl sm:border sm:border-border sm:bg-background',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Switch, search or filters for the list: on the page above it on phones, the card's top bar from `sm`. */
export function ListToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Phones: in line with the page's other blocks (the page's 12px gutter), not with the row text.
    <div className={cn('flex flex-wrap items-center gap-3 px-3 pb-3 sm:border-b sm:border-border sm:p-5', className)}>
      {children}
    </div>
  );
}

/** The white list surface: the groups (or rows) and the empty state. */
export function ListBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-y border-border bg-background sm:border-y-0',
        // The list's own top line is enough: the first strip or empty state drops its top border.
        '[&>:first-child]:border-t-0 [&>section:first-child>[data-list-strip]]:border-t-0',
        // Phones: a group's strip stays under the header while the group scrolls past (like iOS and Android lists).
        'max-sm:[&_[data-list-strip]]:sticky max-sm:[&_[data-list-strip]]:top-[var(--app-header-height)] max-sm:[&_[data-list-strip]]:z-[1]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The rows of a list or of one group. The line between two rows starts at the text, not at the screen edge. */
export function ListRows({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn('[&>li+li_[data-list-divider]]:border-t [&>li+li_[data-list-divider]]:border-border', className)}>
      {children}
    </ul>
  );
}

export interface ListRowProps {
  /** Where the row goes. Without it the row is plain text (e.g. a past entry that can't be opened). */
  to?: string;
  title: ReactNode;
  /** One muted line under the title. */
  line?: ReactNode;
  /** Initials, tile or time before the text (initials and tiles 32px). */
  lead?: ReactNode;
  /** Value at the end (price, count), with a status chip above it when needed. */
  trailing?: ReactNode;
  /**
   * Where the row is in time. Colour only marks state, never decoration: `now` solid blue (running now), `next` a
   * blue tint and bar (the first one to come), `done` greyed (over or stopped), `alert` greyed with a red bar (a
   * no-show), `away` an amber tint and bar (an absence in a day list). Ordinary rows have no bar.
   */
  state?: ListRowState;
}

export type ListRowState = 'now' | 'next' | 'done' | 'alert' | 'away';

// Full class names so Tailwind can see them: background, hover, and the title / line / chevron colours.
const ROW_STATES: Record<ListRowState | 'plain', { row: string; hover: string; title: string; line: string }> = {
  plain: { row: '', hover: 'hover:bg-surface-variant-1', title: 'text-text-primary', line: 'text-text-secondary' },
  now: {
    row: 'bg-interactive',
    hover: 'hover:bg-interactive-hover',
    title: 'text-white',
    line: 'text-white/90',
  },
  next: {
    row: 'bg-interactive/10 shadow-[inset_4px_0_0_var(--color-interactive)]',
    hover: 'hover:bg-interactive/15',
    title: 'text-text-primary',
    line: 'text-text-secondary',
  },
  done: {
    row: 'bg-surface-variant-1',
    hover: 'hover:bg-surface-variant-2',
    title: 'text-text-secondary',
    line: 'text-text-secondary',
  },
  alert: {
    row: 'bg-surface-variant-1 shadow-[inset_4px_0_0_var(--color-danger-text)]',
    hover: 'hover:bg-surface-variant-2',
    title: 'text-text-secondary',
    line: 'text-text-secondary',
  },
  away: {
    row: 'bg-amber-50 shadow-[inset_4px_0_0_var(--color-amber-500)]',
    hover: 'hover:bg-amber-100',
    title: 'text-text-primary',
    line: 'text-text-secondary',
  },
};

export function ListRow({ to, title, line, lead, trailing, state }: ListRowProps) {
  const tone = ROW_STATES[state ?? 'plain'];
  const body = (
    <>
      {lead ? <span className="flex shrink-0 items-center py-1.5 pr-3">{lead}</span> : null}
      <span data-list-divider className="flex min-w-0 flex-1 items-center gap-3 py-1.5 pr-4 sm:pr-5">
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[15px] leading-5 font-semibold', tone.title)}>{title}</span>
          {line ? <span className={cn('block truncate text-[13px] leading-[18px]', tone.line)}>{line}</span> : null}
        </span>
        {trailing ? (
          <span className={cn('shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums', tone.title)}>
            {trailing}
          </span>
        ) : null}
        {to ? <ChevronRight className={cn('size-4 shrink-0', tone.line)} aria-hidden /> : null}
      </span>
    </>
  );
  const base = cn('flex w-full items-stretch pl-4 text-left sm:pl-5', line ? 'min-h-14' : 'min-h-12', tone.row);

  return to ? (
    <Link
      to={to}
      className={cn(
        base,
        tone.hover,
        'transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

/** The grey strip above a group of rows: label left, count right ("November 2026 · 2 kampanjer"). */
export function ListStrip({ label, count, id }: { label: ReactNode; count?: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      data-list-strip
      className="flex h-6.5 items-center justify-between gap-3 border-y border-border bg-slate-100 px-4 text-xs font-semibold text-text-primary sm:px-5"
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

/**
 * The count on the left ("9 kampanjer") and, with more than one page, "Side x av y" with previous/next. The page is
 * in the URL (`?page=`, other parameters kept), so up returns to the same page and paging works without JavaScript.
 */
export function ListFooter({ total, page, totalPages }: { total: string; page: number; totalPages: number }) {
  return (
    <div
      data-list-footer
      className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-1.5 text-[13px] text-text-secondary sm:px-5 sm:py-3 sm:text-sm"
    >
      <span>{total}</span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <span>
            Side {page + 1} av {totalPages}
          </span>
          <PageButton page={page - 1} enabled={page > 0} label="Forrige side">
            <ChevronLeft className="size-4" />
          </PageButton>
          <PageButton page={page + 1} enabled={page + 1 < totalPages} label="Neste side">
            <ChevronRight className="size-4" />
          </PageButton>
        </div>
      ) : null}
    </div>
  );
}

/** A link that keeps the other query parameters; a disabled button at either end. 44px on phones. */
function PageButton({
  page,
  enabled,
  label,
  children,
}: {
  page: number;
  enabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const [searchParams] = useSearchParams();
  const size = 'size-11 sm:size-9';

  if (!enabled) {
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled className={size}>
        {children}
      </Button>
    );
  }

  const params = new URLSearchParams(searchParams);
  if (page > 0) params.set('page', String(page));
  else params.delete('page');

  return (
    <Button asChild variant="outline" size="icon" className={size}>
      <Link to={`?${params.toString()}`} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
