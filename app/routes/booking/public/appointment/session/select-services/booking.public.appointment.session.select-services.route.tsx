import { useEffect, useMemo, useState } from 'react';
import { Form, data, redirect, useNavigation } from 'react-router';
import { Search, X } from 'lucide-react';
import type { GroupedServiceDto } from '~/api/generated';
import { PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError } from '~/lib/flash-message.server';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { requireBookingSession } from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';
import {
  OVERVIEW_RETURN_VALUE,
  shouldReturnToOverview,
  withOverviewReturnTo,
} from '~/routes/booking/public/_utils/booking-return-to';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import { BookingStepTemplate, Container, Input, PageHeader } from '~/ui';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { ServiceRow } from './_components/service-row';
import { ServiceImageDialog } from './_components/service-image-dialog';
import type { Route } from './+types/booking.public.appointment.session.select-services.route';

const ROUTE_ID = 'booking.public.appointment.session.select-services';
const MAX_TOTAL_SERVICES = 5;

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'select-services' }, async () => {
    const routes = getBookingRouteMap();
    const returnToOverview = shouldReturnToOverview(new URL(request.url).searchParams.get('returnTo'));

    try {
      const guardResult = await requireBookingSession(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;

      const serviceGroupsResponse = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'select-services', call: 'get-profile-services', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentSessionProfileServices({
              query: {
                sessionId: session.sessionId,
              },
            }),
          ),
      );

      return data({
        session,
        serviceGroups: serviceGroupsResponse.data?.data || [],
        returnToOverview,
      });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke hente tjenester');
      return redirectWithError(request, routes.employee, message);
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'action', step: 'select-services' }, async () => {
    const routes = getBookingRouteMap();

    try {
      const guardResult = await requireBookingSession(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;
      const formData = await request.formData();
      const returnToOverview = shouldReturnToOverview(formData.get('returnTo'));
      const selectedServices = Array.from(formData.entries())
        .filter(([key]) => key.startsWith('serviceQuantity:'))
        .map(([key, value]) => {
          const serviceId = Number(key.replace('serviceQuantity:', ''));
          const quantity = Number(value);
          return { serviceId, quantity };
        })
        .filter(
          (item) =>
            Number.isInteger(item.serviceId) &&
            item.serviceId > 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0,
        );

      await withBookingBackendCall(
        {
          request,
          routeId: ROUTE_ID,
          step: 'select-services',
          call: 'select-profile-services',
          session,
          context: { selectedServicesCount: selectedServices.length },
        },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.selectAppointmentSessionProfileServices({
              body: {
                selectedServices,
              },
              query: {
                sessionId: session.sessionId,
              },
            }),
          ),
      );

      return redirect(returnToOverview ? withOverviewReturnTo(routes.selectTime) : routes.selectTime);
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke lagre tjenestevalg');
      return redirectWithError(request, routes.selectServices, message);
    }
  });
}

// Each group gets its own tint from the salon's theme colours, so groups are easy to tell apart.
const GROUP_TONES = [
  { header: 'bg-booking-action-muted', dot: 'bg-booking-action' },
  { header: 'bg-booking-accent-muted', dot: 'bg-booking-accent' },
  { header: 'bg-booking-highlight-muted', dot: 'bg-booking-highlight' },
];

export default function BookingSelectServicesPage({ loaderData }: Route.ComponentProps) {
  const serviceGroups = loaderData.serviceGroups ?? [];
  const session = loaderData.session;
  const companyName = useBookingCompanyName();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';
  const returnToOverview = loaderData.returnToOverview;

  const [selectedServiceQuantities, setSelectedServiceQuantities] = useState<Map<number, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogService, setDialogService] = useState<GroupedServiceDto | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const nextMap = new Map<number, number>();
    for (const selectedService of session.selectedServices ?? []) {
      const serviceId = Number(selectedService.serviceId);
      const quantity = Number(selectedService.quantity);
      if (Number.isInteger(serviceId) && serviceId > 0 && Number.isInteger(quantity) && quantity > 0) {
        nextMap.set(serviceId, quantity);
      }
    }
    setSelectedServiceQuantities(nextMap);
  }, [session]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return serviceGroups;

    const query = searchQuery.toLowerCase();
    return serviceGroups
      .map((group) => ({
        ...group,
        services: group.services.filter((service) => service.name.toLowerCase().includes(query)),
      }))
      .filter((group) => group.services.length > 0);
  }, [serviceGroups, searchQuery]);

  const selectedServicesList = useMemo(() => {
    const services = serviceGroups.flatMap((group) => group.services);
    return Array.from(selectedServiceQuantities.entries())
      .map(([serviceId, quantity]) => {
        const service = services.find((candidate) => candidate.id === serviceId);
        return service ? { service, quantity } : null;
      })
      .filter((item): item is { service: GroupedServiceDto; quantity: number } => item !== null);
  }, [serviceGroups, selectedServiceQuantities]);

  if (!session) {
    return (
      <Container gutter="none" size="lg">
        <PageHeader title="Velg tjenester" description="Ugyldig økt" />
      </Container>
    );
  }

  const totalSelectedQuantity = selectedServicesList.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedServicesList.reduce((sum, item) => sum + item.service.price * item.quantity, 0);
  const selectedInGroup = (group: { services: GroupedServiceDto[] }) =>
    group.services.reduce((sum, service) => sum + (selectedServiceQuantities.get(service.id) ?? 0), 0);
  const totalDuration = selectedServicesList.reduce((sum, item) => sum + item.service.duration * item.quantity, 0);
  const atServiceLimit = totalSelectedQuantity >= MAX_TOTAL_SERVICES;

  const setServiceQuantity = (serviceId: number, nextQuantity: number) => {
    setSelectedServiceQuantities((prev) => {
      const currentQuantity = prev.get(serviceId) ?? 0;
      const nextTotal = totalSelectedQuantity - currentQuantity + nextQuantity;
      if (nextQuantity > currentQuantity && nextTotal > MAX_TOTAL_SERVICES) {
        return prev;
      }

      const next = new Map(prev);
      if (nextQuantity <= 0) {
        next.delete(serviceId);
      } else {
        next.set(serviceId, nextQuantity);
      }
      return next;
    });
  };

  const hasSelections = selectedServicesList.length > 0;
  const submitFormId = 'booking-select-services-submit-form';
  const totalServices = serviceGroups.reduce((sum, group) => sum + group.services.length, 0);

  return (
    <BookingStepTemplate label={companyName} title="Hva vil du bestille?">
      <fieldset disabled={isSubmitting} className="contents">
        <div className="space-y-3">
          {totalServices > 6 && (
            <div className="relative">
              <Input
                type="text"
                aria-label="Søk etter tjenester"
                placeholder="Søk etter tjenester"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                variant="booking"
                startIcon={<Search className="text-booking-text-muted" />}
                className="pr-11"
              />

              {searchQuery && (
                <button
                  type="button"
                  aria-label="Tøm søk"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[var(--radius-booking-badge)] p-1 transition-colors hover:bg-booking-surface-strong"
                >
                  <X className="size-4 text-booking-text-muted" />
                </button>
              )}
            </div>
          )}

          {totalServices > 6 && filteredGroups.length > 1 && (
            <nav aria-label="Kategorier" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {filteredGroups.map((group) => {
                const count = selectedInGroup(group);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`service-group-${group.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-booking-badge)] border-[length:var(--border-booking-control)] border-booking-border-strong bg-booking-surface-raised px-4 text-sm font-medium text-booking-text transition-colors hover:bg-booking-action-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text"
                  >
                    {group.name}
                    {count > 0 && (
                      <span className="rounded-full bg-booking-highlight px-1.5 text-xs font-medium text-booking-highlight-contrast">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {filteredGroups.length > 0 ? (
            filteredGroups
              .filter((group) => group.services.length > 0)
              .map((group, groupIndex) => {
                const tone = GROUP_TONES[groupIndex % GROUP_TONES.length];
                return (
                  <section key={group.id} aria-labelledby={`service-group-${group.id}`} className="scroll-mt-4">
                    <ul className="divide-y divide-booking-border overflow-hidden rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised">
                      <li className={`flex items-center justify-between gap-3 px-4 py-2.5 ${tone.header}`}>
                        <h2
                          id={`service-group-${group.id}`}
                          className="flex items-center gap-2 font-semibold text-booking-text"
                        >
                          <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${tone.dot}`} />
                          {group.name}
                        </h2>
                        <span className="text-sm text-booking-text-muted">
                          {group.services.length} {group.services.length === 1 ? 'tjeneste' : 'tjenester'}
                        </span>
                      </li>
                      {group.services.map((service) => (
                        <ServiceRow
                          key={service.id}
                          service={service}
                          quantity={selectedServiceQuantities.get(service.id) ?? 0}
                          onQuantityChange={(nextQuantity) => setServiceQuantity(service.id, nextQuantity)}
                          onViewImages={() => setDialogService(service)}
                          disableIncrement={atServiceLimit}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })
          ) : (
            <div className="rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised p-4 text-center">
              <p className="text-sm text-booking-text-muted">Ingen tjenester passer søket.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm font-medium text-booking-action-text hover:underline"
              >
                Tøm søk
              </button>
            </div>
          )}

          <p className="px-1 text-sm text-booking-text-muted">Prisene er veiledende og kan variere.</p>
        </div>
      </fieldset>

      <ServiceImageDialog service={dialogService} onClose={() => setDialogService(null)} />

      <Form id={submitFormId} method="post" className="hidden">
        {returnToOverview ? <input type="hidden" name="returnTo" value={OVERVIEW_RETURN_VALUE} /> : null}
        {Array.from(selectedServiceQuantities.entries()).map(([serviceId, quantity]) => (
          <input key={serviceId} type="hidden" name={`serviceQuantity:${serviceId}`} value={quantity} />
        ))}
      </Form>
      <BookingFooterNav
        message={
          hasSelections ? (
            <>
              {`${totalSelectedQuantity} valgt · ${formatEstimatedDuration(totalDuration)} · ${formatEstimatedPrice(totalPrice)}`}
              {atServiceLimit ? (
                <span className="block text-xs text-booking-text-muted">
                  Du kan velge opptil {MAX_TOTAL_SERVICES} tjenester.
                </span>
              ) : null}
            </>
          ) : (
            'Velg minst én tjeneste'
          )
        }
      >
        <BookingActionButton
          type="submit"
          form={submitFormId}
          variant="primary"
          loading={isSubmitting}
          disabled={!hasSelections || isSubmitting}
        >
          {isSubmitting ? 'Finner ledige tider...' : 'Velg tid'}
        </BookingActionButton>
      </BookingFooterNav>
    </BookingStepTemplate>
  );
}
