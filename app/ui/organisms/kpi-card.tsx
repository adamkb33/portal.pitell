import * as React from 'react';
import { Badge } from '../atoms/badge';
import { cn } from '../lib/cn';

type KpiTone = 'primary' | 'success' | 'danger' | 'info' | 'purple' | 'warning';
type KpiTrend = 'up' | 'down' | 'flat';

export interface KpiCardProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  value: React.ReactNode;
  /** Small superscript unit next to the value (template `<sup>`). */
  unit?: string;
  /** Icon node (e.g. `<Icon name="calendar" />`). */
  icon?: React.ReactNode;
  tone?: KpiTone;
  /** Trend pill in the top-right. */
  trend?: { direction: KpiTrend; label: string };
  /** Footer comparison line. */
  compare?: React.ReactNode;
}

const iconChipClasses: Record<KpiTone, string> = {
  primary: 'bg-blue-50 text-interactive',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  purple: 'bg-purple-soft text-purple',
  warning: 'bg-warning-soft text-warning',
};

const glowClasses: Record<KpiTone, string> = {
  primary: 'text-interactive',
  success: 'text-success',
  danger: 'text-danger',
  info: 'text-info',
  purple: 'text-purple',
  warning: 'text-warning',
};

const trendBadge: Record<KpiTrend, 'success' | 'danger' | 'purple'> = {
  up: 'success',
  down: 'danger',
  flat: 'purple',
};

export function KpiCard({
  label,
  value,
  unit,
  icon,
  tone = 'primary',
  trend,
  compare,
  className,
  ...props
}: KpiCardProps) {
  return (
    <article
      className={cn(
        'group relative flex min-w-0 flex-col gap-3.5 overflow-hidden rounded-[var(--radius-card)] border border-border bg-background p-5 shadow-card',
        'transition-[transform,box-shadow] motion-safe:duration-slow motion-safe:ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)]',
        className,
      )}
      {...props}
    >
      {/* Corner radial glow (template `.kpi-card:before`). */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute right-0 top-0 size-44 opacity-[0.08] transition-opacity group-hover:opacity-[0.14]',
          '[background:radial-gradient(circle_at_top_right,currentColor,transparent_65%)]',
          glowClasses[tone],
        )}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-[9px] [&_svg]:size-4',
                iconChipClasses[tone],
              )}
            >
              {icon}
            </span>
          ) : null}
          <span className="truncate text-sm font-medium text-text-secondary">{label}</span>
        </div>
        {trend ? (
          <Badge variant={trendBadge[trend.direction]} size="sm" className="shrink-0 font-mono font-medium">
            {trend.label}
          </Badge>
        ) : null}
      </div>

      <div className="relative font-display text-lg font-bold leading-none tracking-[-0.035em] text-text-primary">
        {value}
        {unit ? <sup className="ml-0.5 align-top text-lg font-medium text-text-secondary">{unit}</sup> : null}
      </div>

      {compare ? (
        <div className="mt-auto flex items-center gap-1.5 border-t border-dashed border-border pt-3 text-xs font-medium text-text-disabled">
          {compare}
        </div>
      ) : null}
    </article>
  );
}
