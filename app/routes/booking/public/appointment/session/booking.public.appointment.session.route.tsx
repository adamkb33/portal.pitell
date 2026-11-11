import type { Route } from './+types/booking.public.appointment.session.route';
import { Loader2 } from 'lucide-react';
import { redirect } from 'react-router';
import { AppointmentsController, type AppointmentSessionDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import {
  parseBookingContext,
  resolveBookingTheme,
  serializeBookingContext,
  type BookingContext,
} from '~/lib/booking-context.server';
import { redirectWithError } from '~/lib/flash-message.server';
import { AppointmentSessionService } from '~/routes/booking/public/_services/booking.appointment-session.service.server';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { parseCompanyId } from '~/utils';

const ROUTE_ID = 'booking.public.appointment.session';

function appendSetCookie(headers: Headers, value: string | null | undefined) {
  if (value) {
    headers.append('Set-Cookie', value);
  }
}

async function createBookingContextCookie(context: BookingContext, companyId: number) {
  return serializeBookingContext({
    companyId,
    theme: context.theme,
  });
}

async function validateCompanyBooking(companyId: number, request: Request) {
  await withAuth(request, () =>
    AppointmentsController.validateCompanyBooking({
      path: {
        companyId,
      },
    }),
  );
}

export async function loader(args: Route.LoaderArgs) {
  return withBookingFlowLog({ request: args.request, routeId: ROUTE_ID, kind: 'loader', step: 'session' }, async () => {
    return sessionLoader(args);
  });
}

async function sessionLoader(args: Route.LoaderArgs) {
  const routes = getBookingRouteMap();
  // Tracked outside the try block so the catch-all below can tell whether a valid
  // session already existed before something failed — if it did, recovery must stay
  // inside that session/company rather than ejecting to the company picker.
  let session: AppointmentSessionDto | null = null;

  try {
    const url = new URL(args.request.url);
    const bookingContext = await parseBookingContext(args.request);
    const requestedTheme = url.searchParams.get('theme');
    const theme = requestedTheme === null ? bookingContext.theme : resolveBookingTheme(requestedTheme);

    if (!theme) {
      return redirectWithError(args.request, routes.appointment, 'Tema er ugyldig.');
    }

    const nextContext: BookingContext = {
      companyId: bookingContext.companyId,
      theme,
    };
    const companyIdParam =
      url.searchParams.get('companyId') ?? (nextContext.companyId ? String(nextContext.companyId) : null);
    const shouldResetSession = url.searchParams.get('reset') === '1';
    const sessionResult = shouldResetSession
      ? ({ status: 'missing-cookie' } as const)
      : await withBookingBackendCall(
          { request: args.request, routeId: ROUTE_ID, step: 'session', call: 'get-session' },
          () => AppointmentSessionService.getResult(args.request),
        );
    const resetSessionCookie = shouldResetSession
      ? await withBookingBackendCall(
          { request: args.request, routeId: ROUTE_ID, step: 'session', call: 'delete-session' },
          () => AppointmentSessionService.delete(args.request),
        )
      : null;

    if (sessionResult.status === 'stale-cookie') {
      const clearSessionCookie = await withBookingBackendCall(
        { request: args.request, routeId: ROUTE_ID, step: 'session', call: 'delete-stale-session' },
        () => AppointmentSessionService.delete(args.request),
      );

      if (!companyIdParam) {
        return redirectWithError(args.request, routes.appointment, 'Bookingøkten er utløpt. Start på nytt.', {
          'Set-Cookie': clearSessionCookie,
        });
      }

      const companyIdNumber = parseCompanyId(companyIdParam);

      if (companyIdNumber === null) {
        return redirectWithError(args.request, routes.appointment, 'Selskaps-ID er ugyldig.', {
          'Set-Cookie': clearSessionCookie,
        });
      }

      await withBookingBackendCall(
        {
          request: args.request,
          routeId: ROUTE_ID,
          step: 'session',
          call: 'validate-company-booking',
          context: { companyId: companyIdNumber },
        },
        () => validateCompanyBooking(companyIdNumber, args.request),
      );

      const created = await withBookingBackendCall(
        {
          request: args.request,
          routeId: ROUTE_ID,
          step: 'session',
          call: 'create-session',
          context: { companyId: companyIdNumber },
        },
        () => AppointmentSessionService.create(companyIdNumber, args.request),
      );
      const headers = new Headers();
      headers.append('Set-Cookie', clearSessionCookie);
      headers.append('Set-Cookie', created.setCookieHeader);
      headers.append('Set-Cookie', await createBookingContextCookie(nextContext, companyIdNumber));

      return redirect(routes.employee, { headers });
    }

    session = sessionResult.status === 'found' ? sessionResult.session : null;

    if (session) {
      // Only switch companies when the URL gives us a genuinely different, valid companyId.
      // A missing or malformed companyId must never discard an existing, valid session.
      const companyIdNumber = companyIdParam ? parseCompanyId(companyIdParam) : null;

      if (companyIdNumber !== null && session.companyId !== companyIdNumber) {
        const clearSessionCookie = await withBookingBackendCall(
          { request: args.request, routeId: ROUTE_ID, step: 'session', call: 'delete-session', session },
          () => AppointmentSessionService.delete(args.request),
        );
        const created = await withBookingBackendCall(
          {
            request: args.request,
            routeId: ROUTE_ID,
            step: 'session',
            call: 'create-session',
            context: { companyId: companyIdNumber },
          },
          () => AppointmentSessionService.create(companyIdNumber, args.request),
        );
        const headers = new Headers();
        appendSetCookie(headers, clearSessionCookie);
        appendSetCookie(headers, created.setCookieHeader);
        appendSetCookie(headers, await createBookingContextCookie(nextContext, companyIdNumber));

        return redirect(routes.employee, { headers });
      }

      return redirect(routes.employee, {
        headers: {
          'Set-Cookie': await createBookingContextCookie(nextContext, session.companyId),
        },
      });
    }

    if (!companyIdParam) {
      return redirectWithError(args.request, routes.appointment, 'Selskaps-ID mangler.');
    }

    const companyIdNumber = parseCompanyId(companyIdParam);

    if (companyIdNumber === null) {
      return redirectWithError(args.request, routes.appointment, 'Selskaps-ID er ugyldig.');
    }

    await withBookingBackendCall(
      {
        request: args.request,
        routeId: ROUTE_ID,
        step: 'session',
        call: 'validate-company-booking',
        context: { companyId: companyIdNumber },
      },
      () => validateCompanyBooking(companyIdNumber, args.request),
    );

    const created = await withBookingBackendCall(
      {
        request: args.request,
        routeId: ROUTE_ID,
        step: 'session',
        call: 'create-session',
        context: { companyId: companyIdNumber },
      },
      () => AppointmentSessionService.create(companyIdNumber, args.request),
    );
    const headers = new Headers();
    appendSetCookie(headers, resetSessionCookie);
    appendSetCookie(headers, created.setCookieHeader);
    appendSetCookie(headers, await createBookingContextCookie(nextContext, companyIdNumber));

    return redirect(routes.employee, { headers });
  } catch (error: unknown) {
    if (error instanceof Response) {
      throw error;
    }

    // A session/company already existed before this failed — keep them inside it
    // (its own guard will cascade to the picker if the session turns out to be gone too)
    // instead of ejecting straight to the company picker.
    if (session) {
      return redirectWithError(args.request, routes.employee, 'Noe gikk galt. Prøv igjen.');
    }

    return redirectWithError(args.request, routes.appointment, 'Noe gikk galt under oppstart av booking. Prøv igjen.');
  }
}

export function BookingSessionPage() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <div className="flex items-center gap-2 rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised px-4 py-3 shadow-[var(--shadow-booking-card)]">
        <Loader2 className="size-5 animate-spin text-booking-text-muted" />
        <span className="text-sm text-booking-text-muted">Laster booking...</span>
      </div>
    </div>
  );
}
