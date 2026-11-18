import { formatInTimeZone } from 'date-fns-tz';
import { Check, Gift, ImageIcon, UserX } from 'lucide-react';
import type { AppointmentDto } from '~/api/generated';
import { DEFAULT_QUERY_TIMEZONE } from '~/lib/query';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { ListRow, cn, type ListRowState } from '~/ui';
import { getAppointmentTotals } from '../_utils/appointments.utils';

type AppointmentListRowProps = {
  appointment: AppointmentDto;
  /** The appointment's own page. */
  href: string;
  /** Where the appointment is in time: running now, the first one still to come, or already over. */
  marker?: 'now' | 'next' | 'past' | null;
};

const chipClass = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold';

/**
 * An appointment in the list standard (ui-rules rule 7), the same in every list it appears in. Time (with "Nå" or
 * "Neste" under it), who and what, then the price (with "Ikke møtt", "Fullført" or "Gratis" above it). Colour means
 * time: solid blue now, a blue tint and bar for the next one, grey when over, grey with a red bar for a no-show.
 */
export function AppointmentListRow({ appointment, href, marker }: AppointmentListRowProps) {
  const { services, duration, price } = getAppointmentTotals(appointment);
  const name = [appointment.user.givenName, appointment.user.familyName].filter(Boolean).join(' ') || 'Ukjent kunde';
  const serviceNames = services.map((service) => service.name).filter(Boolean);
  const imageCount = appointment.images?.length ?? 0;
  const noShow = Boolean(appointment.noShow);
  const isFree = Boolean(appointment.loyaltyFreeVisit);
  const state: ListRowState | undefined = noShow
    ? 'alert'
    : marker === 'now'
      ? 'now'
      : marker === 'next'
        ? 'next'
        : marker === 'past'
          ? 'done'
          : undefined;
  const timeColour =
    state === 'now' ? 'text-white' : state === 'done' || state === 'alert' ? 'text-text-secondary' : '';
  const serviceLine = [
    serviceNames.length ? serviceNames.join(', ') : 'Ingen tjenester',
    formatEstimatedDuration(duration),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow
      to={href}
      state={state}
      lead={
        <time dateTime={appointment.startTime} className="block w-11 leading-tight">
          <span className={cn('block text-sm font-semibold tabular-nums', timeColour)}>
            {formatInTimeZone(appointment.startTime, DEFAULT_QUERY_TIMEZONE, 'HH:mm')}
          </span>
          {state === 'now' ? <span className="block text-xs font-semibold text-white">Nå</span> : null}
          {state === 'next' ? <span className="block text-xs font-semibold text-interactive">Neste</span> : null}
        </time>
      }
      title={name}
      line={
        <span className="flex items-center gap-1.5">
          <span className="truncate">{serviceLine}</span>
          {imageCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs">
              <ImageIcon className="size-3" aria-hidden />
              {imageCount}
              <span className="sr-only"> bilder</span>
            </span>
          ) : null}
        </span>
      }
      trailing={
        <span className="flex flex-col items-end gap-0.5">
          {noShow ? (
            <span className={cn(chipClass, 'bg-danger-soft text-danger-text')}>
              <UserX className="size-3" aria-hidden />
              Ikke møtt
            </span>
          ) : marker === 'past' ? (
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
          <span className={noShow || isFree ? 'text-xs font-normal line-through opacity-80' : undefined}>
            {formatEstimatedPrice(price)}
          </span>
        </span>
      }
    />
  );
}
