import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UpHandle } from '~/lib/routing/up-link';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyPageTemplate, Notice, cn } from '~/ui';
import { monthHref, monthTitle, shiftMonth } from '../_utils/month';

/**
 * ‹ November 2026 › — steps one month back or forward and keeps the page. There is nothing after the current month,
 * so › is off there.
 */
export function MonthStepper({ month, currentMonth }: { month: string; currentMonth: string }) {
  const { pathname } = useLocation();
  const isCurrent = month >= currentMonth;
  const step = 'grid size-11 shrink-0 place-items-center rounded-lg sm:size-10';

  return (
    <nav
      aria-label="Måned"
      className="flex w-full items-center gap-1 rounded-xl border border-border bg-background p-0.5 sm:w-fit"
    >
      <Link
        to={monthHref(pathname, shiftMonth(month, -1), currentMonth)}
        aria-label="Forrige måned"
        className={cn(
          step,
          'text-interactive transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive',
        )}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </Link>
      <p aria-live="polite" className="min-w-40 flex-1 text-center font-semibold text-text-primary">
        {monthTitle(month)}
      </p>
      {isCurrent ? (
        <span aria-hidden className={cn(step, 'text-text-disabled')}>
          <ChevronRight className="size-5" />
        </span>
      ) : (
        <Link
          to={monthHref(pathname, shiftMonth(month, 1), currentMonth)}
          aria-label="Neste måned"
          className={cn(
            step,
            'text-interactive transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive',
          )}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

/** One card of stat rows (ui-rules → Tall): muted label, big number, one muted comparison on the right. */
export function StatList({ label, children, columns = 1 }: { label: string; children: ReactNode; columns?: 1 | 2 }) {
  return (
    <section aria-label={label} className="overflow-hidden rounded-xl border border-border bg-background">
      <dl
        className={cn(
          'grid grid-cols-1 [&>div]:border-t [&>div]:border-border [&>div:first-child]:border-t-0',
          columns === 2 && 'sm:grid-cols-2 sm:[&>div:nth-child(2)]:border-t-0 sm:[&>div:nth-child(odd)]:border-r',
        )}
      >
        {children}
      </dl>
    </section>
  );
}

export function StatRow({ label, value, compare }: { label: string; value: ReactNode; compare?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <dt className="text-sm text-text-secondary">{label}</dt>
        <dd className="text-[22px] font-bold leading-tight tabular-nums text-text-primary">{value}</dd>
      </div>
      {compare ? (
        <dd className="max-w-36 text-right text-[13px] text-text-secondary sm:max-w-none">{compare}</dd>
      ) : null}
    </div>
  );
}

/** A card of rows with a grey strip on top. */
export function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="overflow-hidden rounded-xl border border-border bg-background">
      {children}
    </section>
  );
}

/**
 * The header's ‹ on a detail page goes back to Statistikk for the month the page shows, also after stepping months
 * on the detail page itself.
 */
export const statisticsDetailHandle: UpHandle = {
  up: (data) => {
    const metrics = (data as { metrics?: { month: string; currentMonth: string } | null } | undefined)?.metrics;
    if (!metrics) return null;
    const href = ROUTES_MAP['company.booking.statistics'].href;
    return { label: 'Statistikk', href, search: monthHref('', metrics.month, metrics.currentMonth) };
  },
};

/** The frame of every Statistikk page: the month stepper, then the page, or the error. */
export function StatisticsPage({
  title,
  month,
  currentMonth,
  error,
  children,
}: {
  title: string;
  month: string | null;
  currentMonth: string | null;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <CompanyPageTemplate title={title}>
      {month && currentMonth ? <MonthStepper month={month} currentMonth={currentMonth} /> : null}
      {error ? <Notice tone="emphasis" title="Kunne ikke hente statistikk" message={error} /> : children}
    </CompanyPageTemplate>
  );
}
