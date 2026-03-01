import { formatISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Link, Form, useNavigate, useSearchParams } from 'react-router';
import {
  CompanyUserAppointmentController,
  CompanyUserBookingProfileController,
  CompanyUserScheduleController,
} from '~/api/generated/booking';
import type { ContactDto } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/route-tree';
import { ContactSelector } from '~/routes/company/booking/_components/contact-selector';
import { DateTimeSelector } from '~/routes/company/booking/_components/date-time-selector';
import { ServicesSelector } from '~/routes/company/booking/_components/services-selector';
import { redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import type { Route } from './+types/company.booking.appointments.create.existing-user.route';
import {
  parseCreateFlowQueryState,
  parseListPageParam,
  withCreateFlowQueryState,
} from '../_utils/create-flow-query-params';

const CONTACT_PAGE_SIZE = 5;

const toSearchSuffix = (params: URLSearchParams): string => {
  const query = params.toString();
  return query ? `?${query}` : '';
};

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const state = parseCreateFlowQueryState(url.searchParams);
    const contactPage = parseListPageParam(url.searchParams.get('contact-page'), 0);
    const contactSize = parseListPageParam(url.searchParams.get('contact-size'), CONTACT_PAGE_SIZE);
    const contactSearch = url.searchParams.get('contact-search') || '';
    const serviceSearch = url.searchParams.get('service-search') || '';
    const contactDirectionParam = url.searchParams.get('contact-direction');
    const contactDirection = contactDirectionParam === 'DESC' ? 'DESC' : 'ASC';

    const apiResponses = await withAuth(request, async () => {
      const contactsResponse = await CompanyUserAppointmentController.getAppointmentCustomers({
        query: {
          page: contactPage,
          size: contactSize,
          sort: 'familyName',
          direction: contactDirection,
          ...(contactSearch && { search: contactSearch }),
        },
      });

      const bookingProfileResponse = await CompanyUserBookingProfileController.getBookingProfile();
      const scheduleResponse =
        state.serviceIds.length > 0
          ? await CompanyUserScheduleController.getSchedule({
              body: { selectedServiceIds: state.serviceIds },
            })
          : null;

      return { contactsResponse, bookingProfileResponse, scheduleResponse };
    });

    const contactsData = apiResponses.contactsResponse.data?.data;
    const contacts = (contactsData?.content || []).map((user) => ({
      id: user.id,
      givenName: user.givenName,
      familyName: user.familyName,
      email: user.email,
      mobileNumber: user.mobileNumber,
    })) as ContactDto[];

    return {
      contacts,
      contactPagination: {
        page: contactsData?.page ?? 0,
        size: contactsData?.size ?? contactSize,
        totalElements: contactsData?.totalElements ?? 0,
        totalPages: contactsData?.totalPages ?? 1,
      },
      bookingProfile: apiResponses.bookingProfileResponse.data,
      schedules: apiResponses.scheduleResponse?.data?.data || [],
      contactSearch,
      contactDirection,
      serviceSearch,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente data');
    return {
      contacts: [],
      contactPagination: {
        page: 0,
        size: CONTACT_PAGE_SIZE,
        totalElements: 0,
        totalPages: 1,
      },
      bookingProfile: null,
      schedules: [],
      contactSearch: '',
      contactDirection: 'ASC',
      serviceSearch: '',
      error: message,
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const userId = Number(formData.get('userId'));
    const serviceIds =
      formData
        .get('serviceIds')
        ?.toString()
        .split(',')
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0) || [];
    const startTime = formData.get('startTime')?.toString() || '';

    if (!Number.isInteger(userId) || userId <= 0) {
      return { error: 'Velg en eksisterende kunde.' };
    }

    if (serviceIds.length === 0) {
      return { error: 'Velg minst en tjeneste.' };
    }

    if (!startTime) {
      return { error: 'Velg tidspunkt.' };
    }

    const response = await withAuth(request, async () => {
      return CompanyUserAppointmentController.companyUserCreateAppointmentForExistingUser({
        body: { userId, serviceIds, startTime },
      });
    });

    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.appointments'].href,
      response.data?.message?.value || 'Avtalen er opprettet.',
    );
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke opprette avtale');
    return { error: message };
  }
}

export default function CompanyBookingAppointmentsCreateExistingUserPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  type ExistingStep = 'contact' | 'services' | 'time' | 'submit';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = parseCreateFlowQueryState(searchParams);

  const services = loaderData.bookingProfile?.services || [];
  const searchLower = loaderData.serviceSearch.toLowerCase();
  const filteredServices = !loaderData.serviceSearch
    ? services
    : services
        .map((group) => ({
          ...group,
          services: group.services.filter((service) => service.name.toLowerCase().includes(searchLower)),
        }))
        .filter((group) => group.services.length > 0);

  const defaultStep = useMemo<ExistingStep>(() => {
    if (!state.userId) return 'contact';
    if (state.serviceIds.length === 0) return 'services';
    if (!state.startTime) return 'time';
    return 'submit';
  }, [state.userId, state.serviceIds.length, state.startTime]);

  const [openStep, setOpenStep] = useState<ExistingStep>(defaultStep);
  const [draftUserId, setDraftUserId] = useState<number | null>(state.userId);
  const [draftServiceIds, setDraftServiceIds] = useState<number[]>(state.serviceIds);
  const [draftStartTime, setDraftStartTime] = useState<string>(state.startTime);
  const stateServiceIdsKey = state.serviceIds.join(',');

  useEffect(() => {
    setDraftUserId(state.userId);
    setDraftServiceIds(state.serviceIds);
    setDraftStartTime(state.startTime);
    setOpenStep(defaultStep);
  }, [state.userId, stateServiceIdsKey, state.startTime, defaultStep]);

  const updateState = (partial: Partial<typeof state>) => {
    const next = withCreateFlowQueryState(searchParams, partial);
    navigate(`?${next.toString()}`, { replace: true, preventScrollReset: true });
  };

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    navigate(`?${next.toString()}`, { replace: true, preventScrollReset: true });
  };

  const isValid = Boolean(state.userId) && state.serviceIds.length > 0 && Boolean(state.startTime);
  const servicesUnlocked = Boolean(state.userId);
  const timeUnlocked = servicesUnlocked && state.serviceIds.length > 0;
  const submitUnlocked = timeUnlocked && Boolean(state.startTime);
  const switchToNewParams = withCreateFlowQueryState(searchParams, { userId: null });

  return (
    <div className="max-w-3xl space-y-3">
      <Card className="p-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold">Eksisterende kunde</h1>
          <p className="text-sm text-muted-foreground">Velg kunde, tjenester og tidspunkt.</p>
        </div>
        <Button variant="outline" asChild>
          <Link
            to={`${ROUTES_MAP['company.booking.appointments.create.new-user'].href}${toSearchSuffix(switchToNewParams)}`}
          >
            Bytt til ny kunde
          </Link>
        </Button>
      </Card>

      <Card>
        <Accordion
          type="single"
          collapsible={false}
          value={openStep}
          onValueChange={(value) => {
            if (value === 'contact') setOpenStep('contact');
            if (value === 'services' && servicesUnlocked) setOpenStep('services');
            if (value === 'time' && timeUnlocked) setOpenStep('time');
            if (value === 'submit' && submitUnlocked) setOpenStep('submit');
          }}
        >
          <AccordionItem value="contact">
            <AccordionTrigger>1. Velg kunde</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ContactSelector
                contacts={loaderData.contacts}
                selectedContactId={draftUserId}
                onSelectContact={(contact) => setDraftUserId(contact.id)}
                pagination={loaderData.contactPagination}
                onPageChange={(page) => updateParam('contact-page', String(page))}
                onSearchChange={(value) => {
                  updateParam('contact-search', value || null);
                  updateParam('contact-page', '0');
                }}
                initialSearch={loaderData.contactSearch}
              />
              <Button
                className="w-full"
                disabled={!draftUserId}
                onClick={() => {
                  if (!draftUserId) return;
                  updateState({ userId: draftUserId });
                  setOpenStep('services');
                }}
              >
                Lagre og fortsett
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="services">
            <AccordionTrigger disabled={!servicesUnlocked}>2. Velg tjenester</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ServicesSelector
                serviceGroups={filteredServices}
                selectedServiceIds={draftServiceIds}
                onSelectService={(serviceId) =>
                  setDraftServiceIds((prev) => (prev.includes(serviceId) ? prev : [...prev, serviceId]))
                }
                onDeselectService={(serviceId) => setDraftServiceIds((prev) => prev.filter((id) => id !== serviceId))}
                onSearchChange={(value) => updateParam('service-search', value || null)}
                initialSearch={loaderData.serviceSearch}
              />
              <Button
                className="w-full"
                disabled={draftServiceIds.length === 0}
                onClick={() => {
                  if (draftServiceIds.length === 0) return;
                  updateState({ serviceIds: draftServiceIds });
                  setOpenStep('time');
                }}
              >
                Lagre og fortsett
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="time">
            <AccordionTrigger disabled={!timeUnlocked}>3. Velg tidspunkt</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <DateTimeSelector
                schedules={loaderData.schedules}
                selectedDateTime={draftStartTime ? new Date(draftStartTime) : null}
                onSelectDateTime={(date) => setDraftStartTime(formatISO(date))}
              />
              <Button
                className="w-full"
                disabled={!draftStartTime}
                onClick={() => {
                  if (!draftStartTime) return;
                  updateState({ startTime: draftStartTime });
                  setOpenStep('submit');
                }}
              >
                Lagre og fortsett
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="submit">
            <AccordionTrigger disabled={!submitUnlocked}>4. Opprett time</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {actionData?.error && (
                <p className="text-sm text-destructive">
                  <strong>Feil:</strong> {actionData.error}
                </p>
              )}
              <Form method="post" className="space-y-2">
                <input type="hidden" name="userId" value={state.userId ?? ''} />
                <input type="hidden" name="serviceIds" value={state.serviceIds.join(',')} />
                <input type="hidden" name="startTime" value={state.startTime} />
                <Button type="submit" className="w-full" disabled={!isValid}>
                  Opprett time
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate(ROUTES_MAP['company.booking.appointments'].href)}
                >
                  Avbryt
                </Button>
              </Form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
