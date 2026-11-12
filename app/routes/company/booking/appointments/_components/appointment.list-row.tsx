import { format, parseISO } from 'date-fns';
import { Check, Gift, ImageIcon, ChevronRight, UserX } from 'lucide-react';
import { Link } from 'react-router';
import type { AppointmentDto } from '~/api/generated';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { cn } from '~/ui';
import { getAppointmentTotals } from '../_utils/appointments.utils';

type AppointmentListRowProps = {
  appointment: AppointmentDto;
  /** The appointment's own page. */
  href: string;
  /** Where the appointment is in time: running now, the first one still to come, or already over. */
  marker?: 'now' | 'next' | 'past' | null;
};

// Color means time, not decoration. Blue is time that matters now: solid for "Nå", tinted for "Neste".
// Everything else is neutral. Past appointments are greyed: Fullført (green chip) unless marked "ikke møtt"
// (still grey, with a red bar and chip).
// Full class names so Tailwind can see them.
const rowStyles = {
  now: 'bg-interactive text-white hover:bg-interactive-hover',
  next: 'bg-interactive/10 shadow-[inset_4px_0_0_var(--color-interactive)] hover:bg-interactive/15',
  upcoming: 'bg-background shadow-[inset_4px_0_0_var(--color-border)] hover:bg-surface-variant-1',
  past: 'bg-surface-variant-1 hover:bg-surface-variant-2',
  noShow: 'bg-surface-variant-1 shadow-[inset_4px_0_0_var(--color-danger-text)] hover:bg-surface-variant-2',
} as const;

const chipClass = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';

/**
 * Fixed height, three columns. Time (with "Nå"/"Neste" under it), who and what, then price (with "Ikke møtt",
 * "Fullført" or "Gratis" above it). Status never shares a line with the name, so the name always has room.
 */
export function AppointmentListRow({ appointment, href, marker }: AppointmentListRowProps) {
  const { services, duration, price } = getAppointmentTotals(appointment);
  const name = [appointment.user.givenName, appointment.user.familyName].filter(Boolean).join(' ') || 'Ukjent kunde';
  const serviceNames = services.map((service) => service.name).filter(Boolean);
  const imageCount = appointment.images?.length ?? 0;
  const noShow = Boolean(appointment.noShow);
  const isFree = Boolean(appointment.loyaltyFreeVisit);
  const state = noShow ? 'noShow' : (marker ?? 'upcoming');
  const solid = state === 'now';
  const muted = state === 'past' || state === 'noShow';
  const subText = solid ? 'text-white/90' : 'text-text-secondary';
  const strongText = solid ? 'text-white' : muted ? 'text-text-secondary' : 'text-text-primary';
  const serviceLine = [
    serviceNames.length ? serviceNames.join(', ') : 'Ingen tjenester',
    formatEstimatedDuration(duration),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={href}
      className={cn(
        'flex h-[3.75rem] w-full items-center gap-3 px-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5',
        rowStyles[state],
      )}
    >
      <time dateTime={appointment.startTime} className="block w-14 shrink-0">
        <span className={cn('block text-base font-semibold tabular-nums leading-tight', strongText)}>
          {format(parseISO(appointment.startTime), 'HH:mm')}
        </span>
        {state === 'now' ? <span className="block text-xs font-semibold text-white">Nå</span> : null}
        {state === 'next' ? <span className="block text-xs font-semibold text-interactive">Neste</span> : null}
      </time>

      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold', strongText)}>{name}</span>
        <span className={cn('flex items-center gap-1.5 text-sm', subText)}>
          <span className="truncate">{serviceLine}</span>
          {imageCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs">
              <ImageIcon className="size-3" aria-hidden />
              {imageCount}
              <span className="sr-only"> bilder</span>
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {noShow ? (
          <span className={cn(chipClass, 'bg-danger-soft text-danger-text')}>
            <UserX className="size-3" aria-hidden />
            Ikke møtt
          </span>
        ) : state === 'past' ? (
          <span className={cn(chipClass, 'bg-flash-success-bg text-flash-success-text')}>
            <Check className="size-3" aria-hidden />
            Fullført
          </span>
        ) : isFree ? (
          <span className={cn(chipClass, 'bg-flash-success-bg text-flash-success-text')}>
            <Gift className="size-3" aria-hidden />
            Gratis
          </span>
        ) : null}
        <span
          className={cn(
            'whitespace-nowrap tabular-nums',
            noShow || isFree ? 'text-xs line-through opacity-80' : 'text-sm font-semibold',
            strongText,
          )}
        >
          {formatEstimatedPrice(price)}
        </span>
      </span>
      <ChevronRight className={cn('size-4 shrink-0', subText)} aria-hidden />
    </Link>
  );
}
