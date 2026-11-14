import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { CompanySummaryDto } from '~/api/generated';
import { cn } from '~/ui';

/**
 * Rows for Oversikt pages (ui-rules → Page types, Oversikt): an area as a coloured tile, name and one muted line,
 * the whole row opens it. Used by the company Oversikt and Administrasjon.
 */
export function OverviewRow({
  to,
  icon: Icon,
  tone,
  title,
  line,
}: {
  to: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  line: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', tone)}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{title}</span>
        <span className="block truncate text-sm text-text-secondary">{line}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

/** The company as one row: initials, name, org.nr (+ extra), and an "Endre" pill to the settings when allowed. */
export function CompanyRow({
  company,
  extra,
  editHref,
}: {
  company: CompanySummaryDto;
  extra?: string;
  /** Omit when the user can't edit the company. */
  editHref?: string;
}) {
  return (
    <div className="flex min-h-15 items-center gap-3 px-4 py-2.5 sm:px-5">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-interactive text-sm font-bold text-text-inverse"
      >
        {initials(company.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{company.name}</span>
        <span className="block truncate text-sm text-text-secondary">
          {[company.orgNumber ? `Org.nr ${formatOrgNumber(company.orgNumber)}` : null, extra]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      {editHref ? (
        <Link
          to={editHref}
          aria-label="Endre selskapet"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-text-primary ring-1 ring-border transition-colors ring-inset hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive lg:min-h-9"
        >
          Endre
        </Link>
      ) : null}
    </div>
  );
}

const initials = (name?: string) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || '?';

/** 927491745 → "927 491 745", as Brønnøysund writes it. */
export const formatOrgNumber = (orgNumber: string) => orgNumber.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
