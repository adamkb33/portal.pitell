import { data } from 'react-router';
import { PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { requireBookingSession } from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';
import { redirectWithError } from '~/lib/flash-message.server';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import {
  OVERVIEW_RETURN_VALUE,
  shouldReturnToOverview,
  withOverviewReturnTo,
} from '~/routes/booking/public/_utils/booking-return-to';
import { redirect } from 'react-router';
import { useFetcher, useNavigation, useRevalidator } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { BookingStepTemplate, Stack } from '~/ui';
import { DayPickerSection } from './_components/day-picker-section';
import { QuickBookButton } from './_components/quick-book-button';
import { TimeSlotsSection } from './_components/time-slots-section';
import { findScheduleWithTime, getEarliestSlot } from './_utils/select-time-schedule';
import type { Route } from './+types/booking.public.appointment.session.select-time.route';

const SCHEDULE_REFRESH_INTERVAL_MS = 30_000;
const ROUTE_ID = 'booking.public.appointment.session.select-time';

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'select-time' }, async () => {
    const routes = getBookingRouteMap();
    const returnToOverview = shouldReturnToOverview(new URL(request.url).searchParams.get('returnTo'));
    const guardResult = await requireBookingSession(request);
    if (guardResult instanceof Response) {
      return guardResult;
    }
    const { session } = guardResult;

    if (!session.selectedProfileId) {
      return redirect(routes.employee);
    }

    if (!session.selectedServices?.length) {
      return redirect(routes.selectServices);
    }

    try {
      const schedulesResponse = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'select-time', call: 'get-schedules', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentSessionSchedules({
              query: {
                sessionId: session.sessionId,
              },
            }),
          ),
      );
      const schedules = schedulesResponse.data?.data || [];

      return data({
        session,
        schedules,
        returnToOverview,
      });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke hente tilgjengelige tider');
      return redirectWithError(request, routes.selectServices, message);
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'action', step: 'select-time' }, async () => {
    const routes = getBookingRouteMap();
    const guardResult = await requireBookingSession(request);
    if (guardResult instanceof Response) {
      return guardResult;
    }
    const { session } = guardResult;

    const formData = await request.formData();
    const startTime = formData.get('startTime') as string;
    const returnToOverview = shouldReturnToOverview(formData.get('returnTo'));

    if (!startTime) {
      return redirectWithError(request, routes.selectTime, 'Velg et tidspunkt for å fortsette');
    }

    try {
      const saveResponse = await withBookingBackendCall(
        {
          request,
          routeId: ROUTE_ID,
          step: 'select-time',
          call: 'submit-start-time',
          session,
          context: { startTime },
        },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.submitAppointmentSessionStartTime({
              query: {
                sessionId: session.sessionId,
                selectedStartTime: startTime,
              },
            }),
          ),
      );

      if (!saveResponse.data?.data?.selectedStartTime) {
        return redirectWithError(request, routes.selectTime, 'Kunne ikke lagre valgt tidspunkt');
      }

      return redirect(returnToOverview ? routes.overview : routes.selectTime);
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke lagre tidspunkt');
      return redirectWithError(request, routes.selectTime, message);
    }
  });
}

export default function BookingSelectTimePage({ loaderData }: Route.ComponentProps) {
  const schedules = loaderData.schedules ?? [];
  const session = loaderData.session;
  const routes = getBookingRouteMap();
  const companyName = useBookingCompanyName();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const startTimeFetcher = useFetcher();
  const isSelectingTime = startTimeFetcher.state !== 'idle';
  const isSubmitting = navigation.state !== 'idle' || isSelectingTime;
  const returnToOverview = loaderData.returnToOverview;
  const continueHref = returnToOverview ? routes.overview : routes.contact;
  const isContinuing = navigation.state !== 'idle' && navigation.location?.pathname === continueHref;
  const isGoingBack = navigation.state !== 'idle' && navigation.location?.pathname === routes.selectServices;

  const selectedStartTime = session.selectedStartTime ?? '';
  const pendingStartTime = startTimeFetcher.formData?.get('startTime') as string | null;
  const displayTime = pendingStartTime || selectedStartTime || null;
  const earliestSlot = useMemo(() => getEarliestSlot(schedules), [schedules]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Until the customer picks a day, show the day of their chosen time, or the first day with free times.
  const activeDate =
    selectedDate ??
    (displayTime ? findScheduleWithTime(schedules, displayTime) : null) ??
    schedules.find((schedule) => schedule.timeSlots.length > 0)?.date ??
    null;
  const selectedSchedule = schedules.find((schedule) => schedule.date === activeDate);
  const timeSlots = selectedSchedule?.timeSlots ?? [];

  // Jump to the chosen time's day when the time changes, not on every 30-second refresh of free times.
  useEffect(() => {
    if (!displayTime) return;
    const scheduleDate = findScheduleWithTime(schedules, displayTime);
    if (scheduleDate) {
      setSelectedDate(scheduleDate);
    }
  }, [displayTime]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      if (navigation.state !== 'idle') {
        return;
      }

      if (revalidator.state !== 'idle') {
        return;
      }

      revalidator.revalidate();
    }, SCHEDULE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [navigation.state, revalidator]);

  return (
    <BookingStepTemplate label={companyName} title="Når passer det?">
      <startTimeFetcher.Form method="post" preventScrollReset>
        {returnToOverview ? <input type="hidden" name="returnTo" value={OVERVIEW_RETURN_VALUE} /> : null}
        <fieldset disabled={isSubmitting} className="contents">
          <Stack space="md">
            {/* The quick-book button is its own card; no panel around it (compact: no padding that groups nothing). */}
            {earliestSlot && !displayTime && <QuickBookButton slot={earliestSlot} disabled={isSubmitting} />}

            <DayPickerSection schedules={schedules} selectedDate={activeDate} onSelectDate={setSelectedDate} />

            {/* The time section is unchanged; a fully booked day shows its message in the day picker instead. */}
            {timeSlots.length > 0 ? (
              <>
                <div className="md:hidden">
                  <TimeSlotsSection
                    selectedDate={activeDate}
                    timeSlots={timeSlots}
                    displayTime={displayTime}
                    isSubmitting={isSubmitting}
                  />
                </div>
                <div className="hidden md:block">
                  <TimeSlotsSection
                    selectedDate={activeDate}
                    timeSlots={timeSlots}
                    displayTime={displayTime}
                    isSubmitting={isSubmitting}
                    variant="desktop"
                  />
                </div>
              </>
            ) : null}
          </Stack>
        </fieldset>
      </startTimeFetcher.Form>
      <BookingFooterNav>
        <BookingLink
          to={returnToOverview ? withOverviewReturnTo(routes.selectServices) : routes.selectServices}
          variant="secondary"
          loading={isGoingBack}
          disabled={isSubmitting}
        >
          {isGoingBack ? 'Går tilbake...' : 'Tilbake'}
        </BookingLink>
        {selectedStartTime ? (
          <BookingLink to={continueHref} variant="primary" loading={isContinuing} disabled={isSubmitting}>
            {isContinuing ? 'Finner neste steg ...' : returnToOverview ? 'Tilbake til oversikt' : 'Fortsett'}
          </BookingLink>
        ) : (
          <BookingActionButton type="button" variant="primary" disabled>
            Fortsett
          </BookingActionButton>
        )}
      </BookingFooterNav>
    </BookingStepTemplate>
  );
}
