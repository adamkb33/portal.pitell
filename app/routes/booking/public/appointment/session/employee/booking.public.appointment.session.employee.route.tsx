import { Form, data, redirect, useNavigation } from 'react-router';
import { PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError } from '~/lib/flash-message.server';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import { requireBookingSession } from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';
import {
  OVERVIEW_RETURN_VALUE,
  shouldReturnToOverview,
  withOverviewReturnTo,
} from '~/routes/booking/public/_utils/booking-return-to';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { BookingStepTemplate, Grid, Notice } from '~/ui';
import { ProfileCard } from './_components/profile-card';
import type { Route } from './+types/booking.public.appointment.session.employee.route';

const ROUTE_ID = 'booking.public.appointment.session.employee';

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'employee' }, async () => {
    const routes = getBookingRouteMap();
    const returnToOverview = shouldReturnToOverview(new URL(request.url).searchParams.get('returnTo'));

    try {
      const guardResult = await requireBookingSession(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;
      const profilesResponse = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'employee', call: 'get-profiles', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentSessionProfiles({
              query: {
                sessionId: session.sessionId,
              },
            }),
          ),
      );

      const profiles = profilesResponse.data?.data || [];

      if (profiles.length === 1) {
        const onlyProfile = profiles[0];

        if (session.selectedProfileId !== onlyProfile.id) {
          await withBookingBackendCall(
            { request, routeId: ROUTE_ID, step: 'employee', call: 'select-profile', session },
            () =>
              withAuth(request, () =>
                PublicAppointmentSessionController.selectAppointmentSessionProfile({
                  query: {
                    sessionId: session.sessionId,
                    selectedProfileId: onlyProfile.id,
                  },
                }),
              ),
          );
        }

        return redirect(returnToOverview ? withOverviewReturnTo(routes.selectServices) : routes.selectServices);
      }

      return data({
        session,
        profiles,
        selectedProfileId: session.selectedProfileId,
        returnToOverview,
        error: null as string | null,
      });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke hente frisører');
      return data({
        session: null,
        profiles: [],
        selectedProfileId: null,
        returnToOverview,
        error: message,
      });
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'action', step: 'employee' }, async () => {
    const routes = getBookingRouteMap();

    try {
      const guardResult = await requireBookingSession(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;
      const formData = await request.formData();
      const selectedProfileId = formData.get('selectedProfileId') as string;
      const returnToOverview = shouldReturnToOverview(formData.get('returnTo'));

      await withBookingBackendCall(
        {
          request,
          routeId: ROUTE_ID,
          step: 'employee',
          call: 'select-profile',
          session,
          context: { selectedProfileId: Number(selectedProfileId) },
        },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.selectAppointmentSessionProfile({
              query: {
                sessionId: session.sessionId,
                selectedProfileId: Number(selectedProfileId),
              },
            }),
          ),
      );

      return redirect(returnToOverview ? withOverviewReturnTo(routes.selectServices) : routes.selectServices);
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke velge frisør');
      return redirectWithError(request, routes.employee, message);
    }
  });
}

export default function BookingEmployeePage({ loaderData }: Route.ComponentProps) {
  const profiles = loaderData.profiles ?? [];
  const selectedProfileId = loaderData.selectedProfileId;
  const routes = getBookingRouteMap();
  const companyName = useBookingCompanyName();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';
  const returnToOverview = loaderData.returnToOverview;
  const submittingProfileId = navigation.formData?.get('selectedProfileId');
  const pendingDestination = navigation.location?.pathname;

  return (
    <BookingStepTemplate label={companyName} title="Hvem vil du bestille hos?">
      {loaderData.error ? (
        <Notice variant="booking" tone="emphasis" title="Kunne ikke hente behandlere" message={loaderData.error} />
      ) : null}
      <Grid columns={2}>
        {profiles.map((profile) => {
          const isSelected = selectedProfileId === profile.id;
          const isSubmittingProfile =
            isSubmitting && submittingProfileId !== null && String(profile.id) === String(submittingProfileId);

          return (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={isSelected}
              isSubmitting={isSubmitting}
              isSubmittingProfile={isSubmittingProfile}
              returnToOverview={returnToOverview}
            />
          );
        })}
      </Grid>
      <BookingFooterNav>
        <BookingLink
          to={returnToOverview ? routes.overview : routes.appointment}
          variant="secondary"
          loading={isSubmitting && pendingDestination === routes.appointment}
          disabled={isSubmitting}
        >
          {isSubmitting && pendingDestination === routes.appointment ? 'Går tilbake...' : 'Tilbake'}
        </BookingLink>
        {selectedProfileId ? (
          <BookingLink
            to={returnToOverview ? withOverviewReturnTo(routes.selectServices) : routes.selectServices}
            variant="primary"
            loading={isSubmitting && pendingDestination === routes.selectServices}
            disabled={isSubmitting}
          >
            {isSubmitting && pendingDestination === routes.selectServices ? 'Går videre...' : 'Fortsett'}
          </BookingLink>
        ) : (
          <BookingActionButton type="button" variant="primary" disabled>
            Velg behandler
          </BookingActionButton>
        )}
      </BookingFooterNav>
    </BookingStepTemplate>
  );
}
