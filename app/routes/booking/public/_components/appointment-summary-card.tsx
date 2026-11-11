import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import type { GroupedServiceGroupDto } from '~/api/generated';
import { cn } from '~/ui';
import { formatEstimatedDuration, formatEstimatedPrice } from '../_utils/booking-price';

type AppointmentSummaryCardProps = {
  groupedServiceGroups: GroupedServiceGroupDto[];
  companyName?: string;
  addressText?: string;
  /** Shown first inside the card, above the salon (the cancel page puts the date and time here). */
  header?: ReactNode;
};

/**
 * Where and what: the salon with its address, then each service with duration and price, and a total when there is
 * more than one. Shared by a customer's own appointment page and the cancel page, so they show it the same way.
 */
export function AppointmentSummaryCard({
  groupedServiceGroups,
  companyName,
  addressText,
  header,
}: AppointmentSummaryCardProps) {
  const services = groupedServiceGroups.flatMap((group) => group.services);

  return (
    <section className="overflow-hidden rounded-2xl border border-booking-border bg-booking-surface-raised">
      {header ? <div className="p-4">{header}</div> : null}
      <div className={cn('flex items-center gap-3 p-4', header && 'border-t border-booking-border')}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-booking-action-muted text-booking-text">
          <MapPin className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-booking-text">{companyName ?? 'Ukjent sted'}</p>
          {addressText && <p className="text-sm text-booking-text-muted">{addressText}</p>}
        </div>
      </div>
      <ul className="divide-y divide-booking-border border-t border-booking-border bg-booking-action-muted">
        {services.map((service) => (
          <li key={service.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <span className="font-semibold text-booking-text">{service.name}</span>
            <span className="whitespace-nowrap text-sm text-booking-text-muted">
              {formatEstimatedDuration(service.duration)} · {formatEstimatedPrice(service.price)}
            </span>
          </li>
        ))}
        {services.length > 1 && (
          <li className="flex items-baseline justify-between gap-4 px-4 py-3 font-semibold text-booking-text">
            <span>Totalt</span>
            <span className="whitespace-nowrap text-sm">
              {formatEstimatedDuration(services.reduce((sum, s) => sum + s.duration, 0))} ·{' '}
              {formatEstimatedPrice(services.reduce((sum, s) => sum + s.price, 0))}
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
