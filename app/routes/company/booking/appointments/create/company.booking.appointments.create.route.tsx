import type { FormPageHandle } from '~/lib/routing/create-action';
import type { UpHandle } from '~/lib/routing/up-link';
import { addMinutes, format, formatISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { data, Form, useNavigate, useNavigation, useSearchParams } from 'react-router';
import {
  CompanyUserAppointmentController,
  CompanyUserBookingProfileController,
  CompanyUserController,
  CompanyUserScheduleController,
} from '~/api/generated';
import type { ScheduleDto, UserDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  CustomerSelector,
  customerInitials,
  formatMobile,
} from '~/routes/company/booking/_components/customer-selector';
import { DayPickerSection } from '~/routes/booking/public/appointment/session/select-time/_components/day-picker-section';
import { QuickBookButton } from '~/routes/booking/public/appointment/session/select-time/_components/quick-book-button';
import { TimeSlotsSection } from '~/routes/booking/public/appointment/session/select-time/_components/time-slots-section';
import {
  findScheduleWithTime,
  getEarliestSlot,
} from '~/routes/booking/public/appointment/session/select-time/_utils/select-time-schedule';
import { ServicesSelector } from '~/routes/company/booking/_components/services-selector';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import type { Route } from './+types/company.booking.appointments.create.route';
import {
  parseCreateFlowQueryState,
  parseQuantitiesParam,
  serializeQuantitiesParam,
  withCreateFlowQueryState,
} from './_utils/create-flow-query-params';
import {
  Button,
  CompanyPageTemplate,
  Input,
  Label,
  ListStrip,
  Notice,
  Panel as BookingSection,
  categoryTone,
  cn,
} from '~/ui';

/**
 * Ny time: Kunde → Tjenester → Tid (approved sketch 2026-11-09). A form page: the phone bottom menu hides and the page
 * shows its own bar (ui-rules, rule 2). Started from Kalender (`?fra=kalender`, set by Kalender's +), its ‹ and
 * breadcrumb lead back to Kalender instead of Timebestillinger, and saving returns there.
 */
export const handle: FormPageHandle & UpHandle = {
  formPage: true,
  up: (loaderData) =>
    (loaderData as { from?: string | null } | undefined)?.from === 'kalender'
      ? { label: 'Kalender', href: ROUTES_MAP['company.booking.schedule'].href, replacesParent: true }
      : null,
};

/** Without a search the first step shows the newest customers; with one, the first matches. */
const RECENT_CUSTOMERS = 5;
const SEARCH_RESULTS = 10;
const TIME_ZONE = 'Europe/Oslo';

const parsePositiveInt = (value: FormDataEntryValue | null): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const getStatusCode = (error: unknown): number | undefined => {
  const payload = error as { response?: { status?: number } };
  return payload.response?.status;
};

const readFrom = (url: URL) => (url.searchParams.get('fra') === 'kalender' ? 'kalender' : null);

/** "2026-11-10" for an ISO time, in Oslo. */
const osloDateKey = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: TIME_ZONE }).format(new Date(iso));

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const from = readFrom(url);
  try {
    const state = parseCreateFlowQueryState(url.searchParams);
    const contactSearch = (url.searchParams.get('customer-search') || '').trim();
    const contactsQuery = contactSearch
      ? ({ page: 0, size: SEARCH_RESULTS, sort: 'familyName', direction: 'ASC', search: contactSearch } as const)
      : ({ page: 0, size: RECENT_CUSTOMERS, sort: 'createdAt', direction: 'DESC' } as const);

    const apiResponses = await withAuth(request, async () => {
      const contactsResponse = await CompanyUserAppointmentController.getAppointmentCustomers({
        query: contactsQuery,
      });

      const bookingProfileResponse = await CompanyUserBookingProfileController.getBookingProfile();
      const scheduleResponse =
        state.serviceIds.length > 0
          ? await CompanyUserScheduleController.getSchedule({
              body: {
                selectedServices: state.serviceIds.map((serviceId) => ({
                  serviceId,
                  quantity: state.quantities[serviceId] ?? 1,
                })),
              },
            })
          : null;

      return { contactsResponse, bookingProfileResponse, scheduleResponse };
    });

    const contactsData = apiResponses.contactsResponse.data?.data;
    const customers = (contactsData?.content || []).map((user) => ({
      id: user.id,
      givenName: user.givenName,
      familyName: user.familyName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      emailVerified: user.emailVerified,
      mobileVerified: user.mobileVerified,
      provider: user.provider,
    })) as UserDto[];

    return {
      from,
      customers,
      totalMatches: contactsData?.totalElements ?? customers.length,
      bookingProfile: apiResponses.bookingProfileResponse.data,
      schedules: apiResponses.scheduleResponse?.data?.data || [],
      contactSearch,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente data');
    return {
      from,
      customers: [],
      totalMatches: 0,
      bookingProfile: null,
      schedules: [],
      contactSearch: '',
      error: message,
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const userId = parsePositiveInt(formData.get('userId'));
  const email = formData.get('email')?.toString().trim() || '';
  const mobileNumber = formData.get('mobileNumber')?.toString().trim() || '';
  const givenName = formData.get('givenName')?.toString().trim() || '';
  const familyName = formData.get('familyName')?.toString().trim() || '';
  const serviceIds =
    formData
      .get('serviceIds')
      ?.toString()
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0) || [];
  const startTime = formData.get('startTime')?.toString() || '';
  const quantities = parseQuantitiesParam(formData.get('antall')?.toString() ?? null);
  const services = serviceIds.map((serviceId) => ({ serviceId, quantity: quantities[serviceId] ?? 1 }));
  // Back to where the flow started: Kalender on the booked day, or Timebestillinger.
  const doneHref =
    formData.get('fra') === 'kalender' && startTime
      ? `${ROUTES_MAP['company.booking.schedule'].href}?date=${osloDateKey(startTime)}`
      : ROUTES_MAP['company.booking.appointments'].href;

  if (!userId && !email && !mobileNumber) {
    const error = 'Velg kunde eller oppgi e-post/mobilnummer.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  if (serviceIds.length === 0) {
    const error = 'Velg minst en tjeneste.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  if (!startTime) {
    const error = 'Velg tidspunkt.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  if (userId) {
    try {
      const response = await withAuth(request, async () =>
        CompanyUserAppointmentController.companyUserCreateAppointment({
          body: {
            userId,
            services,
            startTime,
          },
        }),
      );

      return redirectWithSuccess(request, doneHref, response.data?.message?.value || 'Avtalen er opprettet.');
    } catch (error) {
      if (getStatusCode(error) === 409) {
        const conflictError = 'Valgt tidspunkt ble nettopp opptatt. Velg et annet tidspunkt.';
        const flashCookie = await setFlashMessage(request, { type: 'error', text: conflictError });
        return data({ error: conflictError }, { status: 409, headers: { 'Set-Cookie': flashCookie } });
      }
      const { message } = resolveErrorPayload(error, 'Kunne ikke opprette avtale');
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }
  }

  const resolverBody = {
    email: email || undefined,
    mobileNumber: mobileNumber || undefined,
    givenName: givenName || undefined,
    familyName: familyName || undefined,
  };

  try {
    const resolvedCustomer = await withAuth(request, async () =>
      CompanyUserController.resolveOrCreateAppointmentCustomer({
        body: resolverBody,
      }),
    );
    const resolvedUserId = resolvedCustomer.data?.data?.userId;
    const resolverStatus = resolvedCustomer.data?.data?.status;

    if (!resolvedUserId || !Number.isInteger(resolvedUserId)) {
      const error = 'Klarte ikke å finne eller opprette kunde. Prøv igjen.';
      const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
      return data({ error }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }

    try {
      const response = await withAuth(request, async () =>
        CompanyUserAppointmentController.companyUserCreateAppointment({
          body: {
            userId: resolvedUserId,
            services,
            startTime,
          },
        }),
      );

      const baseMessage = response.data?.message?.value || 'Avtalen er opprettet.';
      const successMessage =
        resolverStatus === 'CREATED' ? `${baseMessage} Kunden ble opprettet og invitert.` : baseMessage;

      return redirectWithSuccess(request, doneHref, successMessage);
    } catch (error) {
      if (getStatusCode(error) === 409) {
        const conflictError = 'Valgt tidspunkt ble nettopp opptatt. Velg et annet tidspunkt.';
        const flashCookie = await setFlashMessage(request, { type: 'error', text: conflictError });
        return data({ error: conflictError }, { status: 409, headers: { 'Set-Cookie': flashCookie } });
      }
      const { message } = resolveErrorPayload(error, 'Kunne ikke opprette avtale');
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }
  } catch (error) {
    if (getStatusCode(error) === 409) {
      const conflictError = 'E-post og mobilnummer hører til forskjellige kunder. Bruk bare én av dem.';
      const flashCookie = await setFlashMessage(request, { type: 'error', text: conflictError });
      return data({ error: conflictError }, { status: 409, headers: { 'Set-Cookie': flashCookie } });
    }
    const { message } = resolveErrorPayload(error, 'Kunne ikke finne eller opprette kunde');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

type CreateStep = 'contact' | 'services' | 'time';
const STEPS: Array<{ id: CreateStep; label: string }> = [
  { id: 'contact', label: 'Kunde' },
  { id: 'services', label: 'Tjenester' },
  { id: 'time', label: 'Tid' },
];

const formatKr = (value: number) => `${value.toLocaleString('nb-NO')} kr`;
const formatClock = (date: Date) =>
  date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

/** "tir 10. nov" (no trailing dots from the locale's abbreviations). */
const shortDay = (date: Date) =>
  `${format(date, 'EEE', { locale: nb }).replace(/\.$/, '')} ${format(date, 'd. MMM', { locale: nb }).replace(/\.$/, '')}`;

export default function CompanyBookingAppointmentsCreatePage({ loaderData, actionData }: Route.ComponentProps) {
  type CustomerMode = 'existing' | 'new';
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const state = parseCreateFlowQueryState(searchParams);
  const isSubmitting = navigation.state === 'submitting';
  const services = loaderData.bookingProfile?.services || [];

  const defaultStep = useMemo<CreateStep>(() => {
    const hasIdentifier = Boolean(state.userId) || Boolean(state.email.trim()) || Boolean(state.mobileNumber.trim());
    if (!hasIdentifier) return 'contact';
    if (state.serviceIds.length === 0) return 'services';
    return 'time';
  }, [state.userId, state.email, state.mobileNumber, state.serviceIds.length]);

  const [openStep, setOpenStep] = useState<CreateStep>(defaultStep);
  const [customerMode, setCustomerMode] = useState<CustomerMode>(() =>
    !state.userId && (state.email.trim() || state.mobileNumber.trim()) ? 'new' : 'existing',
  );
  const [draftEmail, setDraftEmail] = useState(state.email);
  const [draftMobileNumber, setDraftMobileNumber] = useState(state.mobileNumber);
  const [draftGivenName, setDraftGivenName] = useState(state.givenName);
  const [draftFamilyName, setDraftFamilyName] = useState(state.familyName);
  // Chosen services and how many of each (a service can be booked more than once, like in the customer flow).
  const quantitiesFromUrl = () =>
    Object.fromEntries(state.serviceIds.map((id) => [id, state.quantities[id] ?? 1])) as Record<number, number>;
  const [draftQuantities, setDraftQuantities] = useState<Record<number, number>>(quantitiesFromUrl);
  const draftServiceIds = Object.keys(draftQuantities)
    .map(Number)
    .filter((id) => draftQuantities[id] > 0);
  const [draftStartTime, setDraftStartTime] = useState<string>(state.startTime);
  // Picking a time folds the picker away and shows the overview with the Book button; "Endre" opens it again.
  const [editingTime, setEditingTime] = useState(!state.startTime);
  const stateServiceIdsKey = `${state.serviceIds.join(',')}|${searchParams.get('antall') ?? ''}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(openStep);

  useEffect(() => {
    setDraftQuantities(quantitiesFromUrl());
  }, [stateServiceIdsKey]);

  useEffect(() => {
    setDraftStartTime(state.startTime);
  }, [state.startTime]);

  // Each step starts at the top of the page, with focus on its heading.
  useEffect(() => {
    if (previousStepRef.current === openStep) return;
    previousStepRef.current = openStep;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [openStep]);

  const navigateTo = (next: URLSearchParams) =>
    navigate(`?${next.toString()}`, { replace: true, preventScrollReset: true });
  const updateState = (partial: Partial<typeof state>) => navigateTo(withCreateFlowQueryState(searchParams, partial));

  const selectedServices = services
    .flatMap((group) => group.services.map((service) => ({ ...service, groupName: group.name })))
    .filter((service) => (draftQuantities[service.id] ?? 0) > 0)
    .map((service) => ({ ...service, quantity: draftQuantities[service.id] }));
  const totalCount = selectedServices.reduce((sum, service) => sum + service.quantity, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration * service.quantity, 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price * service.quantity, 0);
  const serviceNames = selectedServices
    .map((service) => (service.quantity > 1 ? `${service.quantity} × ${service.name}` : service.name))
    .join(', ');
  const isValid =
    Boolean(state.userId || state.email || state.mobileNumber) &&
    state.serviceIds.length > 0 &&
    Boolean(draftStartTime);

  // An existing customer's name travels in the URL with their id, so it survives a reload and a later search.
  const customerName =
    [state.givenName, state.familyName].filter(Boolean).join(' ') || state.email || state.mobileNumber || 'Kunde';
  const customerLine = state.userId
    ? null
    : [state.email, state.mobileNumber && formatMobile(state.mobileNumber)].filter(Boolean).join(' · ');

  const start = draftStartTime ? new Date(draftStartTime) : null;
  const timeLabel = start
    ? `${shortDay(start)} · ${formatClock(start)}–${formatClock(addMinutes(start, totalDuration))}`
    : null;
  const longTimeLabel = start ? format(start, 'EEEE d. MMMM', { locale: nb }) : null;
  const earliestSlot = useMemo(() => getEarliestSlot(loaderData.schedules), [loaderData.schedules]);
  // Until a day is picked, show the day of the chosen time, or the first day with free times (as in the customer flow).
  const activeDate =
    selectedDate ??
    (draftStartTime ? findScheduleWithTime(loaderData.schedules, draftStartTime) : null) ??
    loaderData.schedules.find((schedule) => schedule.timeSlots.length > 0)?.date ??
    null;
  const activeTimeSlots = loaderData.schedules.find((schedule) => schedule.date === activeDate)?.timeSlots ?? [];

  const selectCustomer = (customer: UserDto) => {
    updateState({
      userId: customer.id,
      givenName: customer.givenName ?? '',
      familyName: customer.familyName ?? '',
      email: '',
      mobileNumber: '',
    });
    setOpenStep('services');
  };

  const continueWithNewCustomer = () => {
    if (!draftEmail.trim() && !draftMobileNumber.trim()) return;
    updateState({
      userId: null,
      email: draftEmail,
      mobileNumber: draftMobileNumber,
      givenName: draftGivenName,
      familyName: draftFamilyName,
    });
    setOpenStep('services');
  };

  const continueToTime = () => {
    updateState({ serviceIds: draftServiceIds, quantities: draftQuantities, startTime: draftStartTime });
    setOpenStep('time');
  };

  const stepIndex = STEPS.findIndex((step) => step.id === openStep);
  const primaryAction =
    openStep === 'services' ? (
      <Button
        type="button"
        className="h-12 w-full lg:h-11"
        disabled={draftServiceIds.length === 0 || navigation.state !== 'idle'}
        onClick={continueToTime}
      >
        Velg tid
      </Button>
    ) : null;
  const showOverview = openStep === 'time' && Boolean(draftStartTime) && !editingTime;

  const barMessage = selectedServices.length
    ? `${totalCount} valgt · ${totalDuration} min · ${formatKr(totalPrice)}`
    : 'Velg minst én tjeneste';
  const pickTime = (date: Date | null) => {
    setDraftStartTime(date ? formatISO(date) : '');
    if (date) setEditingTime(false);
  };

  const stepHeadingClassName = 'sr-only';
  const customerTone = categoryTone(state.userId ?? 0);

  return (
    <CompanyPageTemplate title="Ny time">
      <div className="flex items-center gap-3">
        <ol aria-label="Steg" className="grid max-w-sm flex-1 grid-cols-3 gap-1">
          {STEPS.map((step, index) => (
            <li
              key={step.id}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={cn('h-1 rounded-full', index <= stepIndex ? 'bg-interactive' : 'bg-border')}
            >
              <span className="sr-only">{step.label}</span>
            </li>
          ))}
        </ol>
        <span className="shrink-0 text-sm text-text-secondary">
          {stepIndex + 1} av {STEPS.length}
        </span>
      </div>

      {loaderData.error && <Notice tone="emphasis" title="Kunne ikke hente data" message={loaderData.error} />}
      {actionData?.error && <Notice tone="emphasis" title="Kunne ikke opprette time" message={actionData.error} />}

      <div className={cn('grid items-start gap-4', showOverview ? 'max-w-2xl' : 'lg:grid-cols-[minmax(0,1fr)_22rem]')}>
        <div className="min-w-0 space-y-3">
          {openStep !== 'contact' && !showOverview ? (
            <section
              aria-label="Valgt"
              className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background lg:hidden"
            >
              <ChosenRow
                lead={
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                      customerTone.tint,
                      customerTone.ink,
                    )}
                  >
                    {customerInitials({ givenName: state.givenName, familyName: state.familyName })}
                  </span>
                }
                label="Kunde"
                value={customerName}
                onEdit={() => setOpenStep('contact')}
              />
              {openStep === 'time' ? (
                <ChosenRow label="Tjenester" value={serviceNames} onEdit={() => setOpenStep('services')} />
              ) : null}
            </section>
          ) : null}

          {openStep === 'contact' && (
            <section
              aria-labelledby="step-heading"
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <h2 id="step-heading" ref={stepHeadingRef} tabIndex={-1} className={stepHeadingClassName}>
                {customerMode === 'existing' ? 'Velg kunde' : 'Ny kunde'}
              </h2>
              {customerMode === 'existing' ? (
                <CustomerSelector
                  customers={loaderData.customers}
                  totalMatches={loaderData.totalMatches}
                  onSelectCustomer={selectCustomer}
                  onAddNewCustomer={() => setCustomerMode('new')}
                  onSearchChange={(search) => {
                    const next = new URLSearchParams(searchParams);
                    if (search) next.set('customer-search', search);
                    else next.delete('customer-search');
                    navigateTo(next);
                  }}
                  initialSearch={loaderData.contactSearch}
                />
              ) : (
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-text-primary">Ny kunde</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-interactive"
                      onClick={() => setCustomerMode('existing')}
                    >
                      Velg eksisterende
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="givenName">Fornavn (valgfritt)</Label>
                      <Input
                        id="givenName"
                        autoComplete="given-name"
                        value={draftGivenName}
                        onChange={(event) => setDraftGivenName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="familyName">Etternavn (valgfritt)</Label>
                      <Input
                        id="familyName"
                        autoComplete="family-name"
                        value={draftFamilyName}
                        onChange={(event) => setDraftFamilyName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobilnummer</Label>
                      <Input
                        id="mobileNumber"
                        type="tel"
                        autoComplete="tel"
                        value={draftMobileNumber}
                        onChange={(event) => setDraftMobileNumber(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-post</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={draftEmail}
                        onChange={(event) => setDraftEmail(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="button"
                      disabled={isSubmitting || (!draftEmail.trim() && !draftMobileNumber.trim())}
                      onClick={continueWithNewCustomer}
                    >
                      Fortsett
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {openStep === 'services' && (
            <section
              aria-labelledby="step-heading"
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <h2 id="step-heading" ref={stepHeadingRef} tabIndex={-1} className={stepHeadingClassName}>
                Velg tjenester
              </h2>
              <ServicesSelector
                serviceGroups={services}
                quantities={draftQuantities}
                onQuantityChange={(serviceId, quantity) => {
                  setDraftQuantities((previous) => {
                    const next = { ...previous };
                    if (quantity > 0) next[serviceId] = quantity;
                    else delete next[serviceId];
                    return next;
                  });
                  setDraftStartTime('');
                }}
              />
            </section>
          )}

          {openStep === 'time' && (
            <section aria-labelledby="step-heading" className="space-y-3">
              <h2 id="step-heading" ref={stepHeadingRef} tabIndex={-1} className={stepHeadingClassName}>
                {showOverview ? 'Bekreft timen' : 'Velg tidspunkt'}
              </h2>
              {showOverview && start ? (
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <ListStrip label="Oversikt" />
                  <dl className="divide-y divide-border">
                    <SummaryRow
                      label="Kunde"
                      value={customerName}
                      line={customerLine}
                      empty=""
                      onEdit={() => setOpenStep('contact')}
                    />
                    <SummaryRow
                      label="Tjenester"
                      value={serviceNames}
                      line={`${totalDuration} min`}
                      empty=""
                      onEdit={() => setOpenStep('services')}
                    />
                    <SummaryRow
                      label="Tid"
                      value={longTimeLabel ? `${longTimeLabel[0].toUpperCase()}${longTimeLabel.slice(1)}` : ''}
                      line={`${formatClock(start)}–${formatClock(addMinutes(start, totalDuration))}`}
                      empty=""
                      onEdit={() => setEditingTime(true)}
                    />
                    <div className="flex items-center justify-between gap-3 px-5 py-3">
                      <dt className="font-semibold text-text-primary">Totalt</dt>
                      <dd className="text-lg font-bold tabular-nums text-text-primary">{formatKr(totalPrice)}</dd>
                    </div>
                  </dl>
                  <div className="border-t border-border p-3">
                    <Button
                      type="submit"
                      form="create-appointment-form"
                      disabled={!isValid || navigation.state !== 'idle'}
                      className="h-12 w-full bg-confirm text-text-inverse hover:bg-confirm-hover lg:h-11"
                    >
                      {isSubmitting ? 'Booker…' : 'Book time'}
                    </Button>
                  </div>
                </div>
              ) : (
                // The customer booking flow's time step (first free time, day strip, times by hour), picking instead of
                // submitting; in company blue through `.company-booking-scope`.
                <div className="company-booking-scope space-y-4">
                  {earliestSlot ? (
                    <BookingSection>
                      <QuickBookButton slot={earliestSlot} onSelect={(time) => pickTime(new Date(time))} />
                    </BookingSection>
                  ) : null}
                  <DayPickerSection
                    schedules={loaderData.schedules}
                    selectedDate={activeDate}
                    onSelectDate={setSelectedDate}
                  />
                  {activeTimeSlots.length > 0 ? (
                    <>
                      <div className="md:hidden">
                        <TimeSlotsSection
                          selectedDate={activeDate}
                          timeSlots={activeTimeSlots}
                          displayTime={draftStartTime || null}
                          isSubmitting={isSubmitting}
                          onSelectTime={(time) => pickTime(new Date(time))}
                        />
                      </div>
                      <div className="hidden md:block">
                        <TimeSlotsSection
                          selectedDate={activeDate}
                          timeSlots={activeTimeSlots}
                          displayTime={draftStartTime || null}
                          isSubmitting={isSubmitting}
                          variant="desktop"
                          onSelectTime={(time) => pickTime(new Date(time))}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              )}
              <Form method="post" id="create-appointment-form">
                <input type="hidden" name="userId" value={state.userId ?? ''} />
                <input type="hidden" name="email" value={state.email} />
                <input type="hidden" name="mobileNumber" value={state.mobileNumber} />
                <input type="hidden" name="givenName" value={state.givenName} />
                <input type="hidden" name="familyName" value={state.familyName} />
                <input type="hidden" name="serviceIds" value={state.serviceIds.join(',')} />
                <input
                  type="hidden"
                  name="antall"
                  value={serializeQuantitiesParam(state.quantities, state.serviceIds)}
                />
                <input type="hidden" name="startTime" value={draftStartTime} />
                <input type="hidden" name="fra" value={loaderData.from ?? ''} />
              </Form>
            </section>
          )}
        </div>

        {showOverview ? null : (
          <aside
            aria-label="Oppsummering"
            aria-live="polite"
            className="hidden min-w-0 overflow-hidden rounded-xl border border-border bg-background lg:sticky lg:top-[calc(var(--app-header-height)+1rem)] lg:block"
          >
            <ListStrip label="Oppsummering" />
            <dl className="divide-y divide-border">
              <SummaryRow
                label="Kunde"
                value={
                  openStep === 'contact' && !state.userId && !state.email && !state.mobileNumber ? null : customerName
                }
                line={customerLine}
                empty="Ikke valgt"
                onEdit={openStep !== 'contact' ? () => setOpenStep('contact') : undefined}
              />
              <SummaryRow
                label="Tjenester"
                value={serviceNames || null}
                line={selectedServices.length ? `${totalDuration} min` : null}
                trailing={selectedServices.length ? formatKr(totalPrice) : null}
                empty="Ingen valgt"
                onEdit={openStep === 'time' ? () => setOpenStep('services') : undefined}
              />
              <SummaryRow
                label="Tid"
                value={longTimeLabel ? `${longTimeLabel[0].toUpperCase()}${longTimeLabel.slice(1)}` : null}
                line={start ? `${formatClock(start)}–${formatClock(addMinutes(start, totalDuration))}` : null}
                empty="Ikke valgt"
              />
            </dl>
            {primaryAction ? <div className="border-t border-border p-3">{primaryAction}</div> : null}
          </aside>
        )}
      </div>

      {primaryAction ? (
        <>
          {/* Room for the floating bar, so it never covers the last row. */}
          <div aria-hidden className="h-28 lg:hidden" />
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 px-3 lg:hidden">
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
              <p
                aria-live="polite"
                className="bg-surface-accent-strong px-3 py-2 text-center text-sm text-text-primary"
              >
                {barMessage}
              </p>
              <div className="p-2">{primaryAction}</div>
            </div>
          </div>
        </>
      ) : null}
    </CompanyPageTemplate>
  );
}

/** A finished step on phones: what was chosen, with "Endre" to go back to it. */
function ChosenRow({
  lead,
  label,
  value,
  onEdit,
}: {
  lead?: ReactNode;
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex min-h-12 items-center gap-2.5 px-4 py-2 text-sm">
      {lead}
      <span className="sr-only">{label}:</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{value}</span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Endre ${label.toLowerCase()}`}
        className="grid h-11 shrink-0 place-items-center rounded-[var(--radius-control)] px-2 font-semibold text-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
      >
        Endre
      </button>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  line,
  trailing,
  empty,
  onEdit,
}: {
  label: string;
  value: string | null;
  line?: string | null;
  trailing?: string | null;
  empty: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-text-secondary">{label}</dt>
        <dd className={cn('truncate font-semibold', value ? 'text-text-primary' : 'font-normal text-text-secondary')}>
          {value ?? empty}
        </dd>
        {value && line ? <dd className="truncate text-sm text-text-secondary">{line}</dd> : null}
      </div>
      {trailing ? <dd className="shrink-0 font-semibold tabular-nums">{trailing}</dd> : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Endre ${label.toLowerCase()}`}
          className="shrink-0 rounded-[var(--radius-control)] px-1 text-sm font-semibold text-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
        >
          Endre
        </button>
      ) : null}
    </div>
  );
}
