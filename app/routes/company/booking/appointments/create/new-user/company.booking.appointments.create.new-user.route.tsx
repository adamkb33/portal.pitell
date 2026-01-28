import { formatISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Form, Link, useNavigate, useSearchParams } from 'react-router';
import { CompanyUserAppointmentController, CompanyUserBookingProfileController, CompanyUserScheduleController } from '~/api/generated/booking';
import { withAuth } from '~/api/utils/with-auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/route-tree';
import { DateTimeSelector } from '~/routes/company/booking/_components/date-time-selector';
import { ServicesSelector } from '~/routes/company/booking/_components/services-selector';
import { redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import type { Route } from './+types/company.booking.appointments.create.new-user.route';
import {
  isDuplicateContactError,
  parseCreateFlowQueryState,
  withCreateFlowQueryState,
} from '../_utils/create-flow-query-params';

const toSearchSuffix = (params: URLSearchParams): string => {
  const query = params.toString();
  return query ? `?${query}` : '';
};

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const state = parseCreateFlowQueryState(url.searchParams);
    const serviceSearch = url.searchParams.get('service-search') || '';

    const apiResponses = await withAuth(request, async () => {
      const bookingProfileResponse = await CompanyUserBookingProfileController.getBookingProfile();
      const scheduleResponse =
        state.serviceIds.length > 0
          ? await CompanyUserScheduleController.getSchedule({
              body: { selectedServiceIds: state.serviceIds },
            })
          : null;

      return { bookingProfileResponse, scheduleResponse };
    });

    return {
      bookingProfile: apiResponses.bookingProfileResponse.data,
      schedules: apiResponses.scheduleResponse?.data?.data || [],
      serviceSearch,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente data');
    return {
      bookingProfile: null,
      schedules: [],
      serviceSearch: '',
      error: message,
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get('email')?.toString().trim() || '';
  const mobileNumber = formData.get('mobileNumber')?.toString().trim() || '';
  const serviceIds =
    formData
      .get('serviceIds')
      ?.toString()
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0) || [];
  const startTime = formData.get('startTime')?.toString() || '';

  if (!email && !mobileNumber) {
    return { error: 'Oppgi e-post eller mobilnummer.' };
  }

  if (serviceIds.length === 0) {
    return { error: 'Velg minst en tjeneste.' };
  }

  if (!startTime) {
    return { error: 'Velg tidspunkt.' };
  }

  try {
    const response = await withAuth(request, async () => {
      return CompanyUserAppointmentController.companyUserCreateAppointmentForNewUser({
        body: { email: email || undefined, mobileNumber: mobileNumber || undefined, serviceIds, startTime },
      });
    });

    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.appointments'].href,
      response.data?.message?.value || 'Avtalen er opprettet.',
    );
  } catch (error) {
    if (isDuplicateContactError(error)) {
      const preserveParams = new URLSearchParams();
      preserveParams.set('serviceIds', serviceIds.join(','));
      preserveParams.set('startTime', startTime);
      if (email) preserveParams.set('email', email);
      if (mobileNumber) preserveParams.set('mobileNumber', mobileNumber);

      return {
        error: 'Kontakten finnes allerede. Bytt til eksisterende kunde for å fullføre bookingen.',
        duplicateContact: true,
        switchHref: `${ROUTES_MAP['company.booking.appointments.create.existing-user'].href}${toSearchSuffix(preserveParams)}`,
      };
    }

    const { message } = resolveErrorPayload(error, 'Kunne ikke opprette avtale');
    return { error: message };
  }
}

export default function CompanyBookingAppointmentsCreateNewUserPage({ loaderData, actionData }: Route.ComponentProps) {
  type NewUserStep = 'contact' | 'services' | 'time' | 'submit';
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

  const defaultStep = useMemo<NewUserStep>(() => {
    const hasContact = Boolean(state.email.trim()) || Boolean(state.mobileNumber.trim());
    if (!hasContact) return 'contact';
    if (state.serviceIds.length === 0) return 'services';
    if (!state.startTime) return 'time';
    return 'submit';
  }, [state.email, state.mobileNumber, state.serviceIds.length, state.startTime]);

  const [openStep, setOpenStep] = useState<NewUserStep>(defaultStep);
  const [draftEmail, setDraftEmail] = useState(state.email);
  const [draftMobileNumber, setDraftMobileNumber] = useState(state.mobileNumber);
  const [draftServiceIds, setDraftServiceIds] = useState<number[]>(state.serviceIds);
  const [draftStartTime, setDraftStartTime] = useState<string>(state.startTime);
  const stateServiceIdsKey = state.serviceIds.join(',');

  useEffect(() => {
    setDraftEmail(state.email);
    setDraftMobileNumber(state.mobileNumber);
    setDraftServiceIds(state.serviceIds);
    setDraftStartTime(state.startTime);
    setOpenStep(defaultStep);
  }, [state.email, state.mobileNumber, stateServiceIdsKey, state.startTime, defaultStep]);

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

  const hasContactInfo = Boolean(state.email.trim()) || Boolean(state.mobileNumber.trim());
  const isValid = hasContactInfo && state.serviceIds.length > 0 && Boolean(state.startTime);
  const servicesUnlocked = hasContactInfo;
  const timeUnlocked = servicesUnlocked && state.serviceIds.length > 0;
  const submitUnlocked = timeUnlocked && Boolean(state.startTime);

  const switchToExistingParams = withCreateFlowQueryState(searchParams, {
    email: '',
    mobileNumber: '',
  });

  return (
    <div className="max-w-3xl space-y-3">
      <Card className="p-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold">Ny kunde</h1>
          <p className="text-sm text-muted-foreground">Registrer kontaktinfo, velg tjenester og tidspunkt.</p>
        </div>
        <Button variant="outline" asChild>
          <Link
            to={`${ROUTES_MAP['company.booking.appointments.create.existing-user'].href}${toSearchSuffix(switchToExistingParams)}`}
          >
            Bytt til eksisterende kunde
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
            <AccordionTrigger>1. Kontaktinfo</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    name="email-view"
                    placeholder="navn@eksempel.no"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobilnummer</Label>
                  <Input
                    id="mobileNumber"
                    name="mobileNumber-view"
                    placeholder="+47 99 99 99 99"
                    value={draftMobileNumber}
                    onChange={(e) => setDraftMobileNumber(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Minst ett av feltene (e-post eller mobilnummer) må fylles ut.</p>
              <Button
                className="w-full"
                disabled={!draftEmail.trim() && !draftMobileNumber.trim()}
                onClick={() => {
                  if (!draftEmail.trim() && !draftMobileNumber.trim()) return;
                  updateState({ email: draftEmail, mobileNumber: draftMobileNumber });
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
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    <strong>Feil:</strong> {actionData.error}
                  </p>
                  {actionData.duplicateContact && actionData.switchHref && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={actionData.switchHref}>Bytt til eksisterende kunde</Link>
                    </Button>
                  )}
                </div>
              )}
              <Form method="post" className="space-y-2">
                <input type="hidden" name="email" value={state.email} />
                <input type="hidden" name="mobileNumber" value={state.mobileNumber} />
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

