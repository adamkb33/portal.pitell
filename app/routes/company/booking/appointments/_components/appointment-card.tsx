import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_QUERY_TIMEZONE } from '~/lib/query';
import { nb } from 'date-fns/locale';
import { CircleCheck, Clock, Gift, ImagePlus, Mail, MessageSquare, Phone, UserX } from 'lucide-react';
import { Link } from 'react-router';
import type { AppointmentDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { cn } from '~/ui';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { isAppointmentCompleted, getAppointmentTotals } from '../_utils/appointments.utils';

type AppointmentCardProps = {
  appointment: AppointmentDto;
  /** Shown only for upcoming appointments; past ones can't be deleted. */
  onDelete?: () => void;
  isDeleting?: boolean;
  /** Admin only, and only offered once the appointment has started. Toggles "ikke møtt". */
  onToggleNoShow?: () => void;
  isTogglingNoShow?: boolean;
};

const tonalActionClass =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-interactive/10 px-3 text-sm font-semibold text-interactive transition-colors hover:bg-interactive/15 focus-visible:outline-2 focus-visible:outline-interactive lg:min-h-10';

/** One appointment, each fact said once. */
export function AppointmentCard({
  appointment,
  onDelete,
  isDeleting = false,
  onToggleNoShow,
  isTogglingNoShow = false,
}: AppointmentCardProps) {
  const isPast = isAppointmentCompleted(appointment);
  const { services, duration, price } = getAppointmentTotals(appointment);
  const name = [appointment.user.givenName, appointment.user.familyName].filter(Boolean).join(' ') || 'Ukjent kunde';
  const { mobileNumber, email } = appointment.user;
  const uploadHref = `${ROUTES_MAP['company.booking.appointments.upload-image'].href}?id=${appointment.id}`;
  const noShow = Boolean(appointment.noShow);
  // Over and not "ikke møtt" means Fullført: greyed, with a green line.
  const isDone = !noShow && new Date(appointment.endTime) < new Date();
  const muted = noShow || isDone;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={cn('text-2xl font-bold tracking-tight', muted ? 'text-text-secondary' : 'text-text-primary')}>
          {name}
        </h2>
        {isPast ? null : (
          <span className="rounded-full bg-interactive/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Kommende
          </span>
        )}
      </div>
      <p className="mt-1 text-base font-semibold text-text-primary first-letter:uppercase">
        {formatInTimeZone(appointment.startTime, DEFAULT_QUERY_TIMEZONE, 'EEEE d. MMMM', { locale: nb })}
      </p>
      <p className="flex items-center gap-1.5 text-sm text-text-secondary">
        <Clock className="size-4" aria-hidden />
        {formatInTimeZone(appointment.startTime, DEFAULT_QUERY_TIMEZONE, 'HH:mm')}–
        {formatInTimeZone(appointment.endTime, DEFAULT_QUERY_TIMEZONE, 'HH:mm')} · {formatEstimatedDuration(duration)}
      </p>

      {isDone ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-flash-success-bg px-3 py-2.5 text-sm font-semibold text-flash-success-text">
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          Fullført
        </p>
      ) : null}
      {noShow ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
          <UserX className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Ikke møtt.</span> Kunden møtte ikke opp. Timen teller ikke i
            lojalitetsprogrammet.
          </span>
        </div>
      ) : null}

      {appointment.loyaltyFreeVisit ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-flash-success-bg px-3 py-2.5 text-sm font-semibold text-flash-success-text">
          <Gift className="mt-0.5 size-4 shrink-0" aria-hidden />
          Gratis besøk (lojalitetsprogram). Ikke ta betalt for denne timen.
        </div>
      ) : null}

      {mobileNumber || email ? (
        <div className="mt-4">
          <div className="flex gap-2">
            {mobileNumber ? (
              <a href={`tel:${mobileNumber}`} className={tonalActionClass}>
                <Phone className="size-4" aria-hidden />
                Ring
              </a>
            ) : null}
            {mobileNumber ? (
              <a href={`sms:${mobileNumber}`} className={tonalActionClass}>
                <MessageSquare className="size-4" aria-hidden />
                Send melding
              </a>
            ) : email ? (
              <a href={`mailto:${email}`} className={tonalActionClass}>
                <Mail className="size-4" aria-hidden />
                Send e-post
              </a>
            ) : null}
          </div>
          <p className="mt-1.5 break-all text-xs text-text-secondary">
            {[mobileNumber, email].filter(Boolean).join(' · ')}
          </p>
        </div>
      ) : null}

      <ul
        className={cn(
          'mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border text-sm',
          muted && 'text-text-secondary',
        )}
      >
        {services.length === 0 ? <li className="px-4 py-3 text-text-secondary">Ingen tjenester registrert</li> : null}
        {services.map((service) => (
          <li key={service.id} className="flex justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className={cn('block font-semibold', !muted && 'text-text-primary')}>{service.name}</span>
              <span className="block text-text-secondary">{formatEstimatedDuration(service.duration)}</span>
            </span>
            <span className={cn('shrink-0 whitespace-nowrap font-semibold tabular-nums', noShow && 'line-through')}>
              {formatEstimatedPrice(service.price)}
            </span>
          </li>
        ))}
        {services.length > 1 ? (
          <li className="flex items-center justify-between gap-3 bg-slate-100 px-4 py-3 font-semibold">
            <span>
              Estimert total{' '}
              <span className="font-normal text-text-secondary">· {formatEstimatedDuration(duration)}</span>
            </span>
            <span className={cn('shrink-0 whitespace-nowrap tabular-nums', noShow && 'line-through')}>
              {formatEstimatedPrice(price)}
            </span>
          </li>
        ) : null}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {appointment.images?.map((image) => (
          <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
            <img
              src={image.url}
              alt={image.label || 'Avtalebilde'}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
          </a>
        ))}
        <Link
          to={uploadHref}
          className="flex aspect-[4/3] min-h-11 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-400 text-xs font-medium text-text-secondary transition-colors hover:border-interactive hover:text-interactive focus-visible:outline-2 focus-visible:outline-interactive"
        >
          <ImagePlus className="size-5" aria-hidden />
          Last opp bilde
        </Link>
      </div>

      {(onDelete && !isPast) || onToggleNoShow ? (
        <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
          {onToggleNoShow ? (
            <button
              type="button"
              disabled={isTogglingNoShow}
              onClick={onToggleNoShow}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
            >
              {appointment.noShow ? 'Angre ikke møtt' : 'Marker som ikke møtt'}
            </button>
          ) : null}
          {onDelete && !isPast ? (
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
            >
              Slett time
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
