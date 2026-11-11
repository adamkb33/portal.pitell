import type { GroupedServiceGroupDto } from '~/api/generated';
import { ServiceRow } from '~/routes/booking/public/appointment/session/select-services/_components/service-row';
import { categoryTone, cn } from '~/ui';

/** A service can be booked up to this many times in one appointment, like in the customer booking flow. */
export const MAX_SERVICE_QUANTITY = 10;

type ServiceSelectorProps = {
  serviceGroups: GroupedServiceGroupDto[];
  /** How many of each service is chosen; a missing id is 0. */
  quantities: Record<number, number>;
  onQuantityChange: (serviceId: number, quantity: number) => void;
};

/**
 * Ny time, step 2: the customer booking flow's service rows (tap to choose, − n + to book a service more than once)
 * under the company's group strips, which keep the colours of the Tjenester page. The rows' booking colours become
 * the company's blue in `.company-booking-scope` (app.css).
 */
export function ServicesSelector({ serviceGroups, quantities, onQuantityChange }: ServiceSelectorProps) {
  // Groups keep the colour they have on the Tjenester page: their place among the groups, by id.
  const colorPosition = new Map(
    [...serviceGroups]
      .map((group) => group.id)
      .sort((a, b) => a - b)
      .map((id, index) => [id, index] as const),
  );
  const groups = serviceGroups.filter((group) => group.services.length > 0);

  if (groups.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-text-secondary sm:px-5">Ingen tjenester på bookingprofilen</p>
    );
  }

  return (
    <div className="company-booking-scope">
      {groups.map((group, index) => {
        const tone = categoryTone(colorPosition.get(group.id) ?? index);
        const headingId = `create-service-group-${group.id}`;
        return (
          <section key={group.id} aria-labelledby={headingId}>
            <h3
              id={headingId}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold text-text-primary sm:px-5',
                index > 0 && 'border-t border-border',
                tone.tint,
              )}
            >
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', tone.dot)} />
              {group.name}
              <span className="ml-auto font-normal text-text-secondary">
                {group.services.length} {group.services.length === 1 ? 'tjeneste' : 'tjenester'}
              </span>
            </h3>
            <ul className="divide-y divide-border border-t border-border">
              {group.services.map((service) => {
                const quantity = quantities[service.id] ?? 0;
                return (
                  <ServiceRow
                    key={service.id}
                    // No photo viewer on the company side, so the row shows no photo button.
                    service={{ ...service, images: [] }}
                    quantity={quantity}
                    disableIncrement={quantity >= MAX_SERVICE_QUANTITY}
                    onQuantityChange={(next) =>
                      onQuantityChange(service.id, Math.max(0, Math.min(MAX_SERVICE_QUANTITY, next)))
                    }
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
