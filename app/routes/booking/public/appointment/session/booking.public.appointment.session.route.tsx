import { redirect } from 'react-router';
import { Loader2 } from 'lucide-react';
import { AppointmentsController } from '~/api/generated/booking';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithError } from '~/routes/company/_lib/flash-message.server';
import type { Route } from './+types/booking.public.appointment.session.route';

export async function loader(args: Route.LoaderArgs) {
  try {
    const { AppointmentSessionService } = await import('./_services/appointment-session.service.server');
    const session = await AppointmentSessionService.get(args.request);
    const url = new URL(args.request.url);

    const parseCompanyId = (value: string): number | null => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    };

    if (session) {
      const companyIdParam = url.searchParams.get('companyId');
      if (companyIdParam) {
        const companyIdNumber = parseCompanyId(companyIdParam);
        if (companyIdNumber === null) {
          return redirectWithError(
            args.request,
            ROUTES_MAP['booking.public.appointment'].href,
            'Selskaps-ID er ugyldig.',
          );
        }

        if (session.companyId == companyIdNumber) {
          return redirect(`${ROUTES_MAP['booking.public.appointment.session.contact'].href}`);
        }

        if (session.companyId !== companyIdNumber) {
          await AppointmentSessionService.delete(args.request);
          const created = await AppointmentSessionService.create(companyIdNumber);

          return redirect(`${ROUTES_MAP['booking.public.appointment.session.contact'].href}`, {
            headers: {
              'Set-Cookie': created.setCookieHeader,
            },
          });
        }
      }

      return redirect(`${ROUTES_MAP['booking.public.appointment.session.contact'].href}`);
    }
    const companyIdParam = url.searchParams.get('companyId');

    if (!companyIdParam) {
      return redirectWithError(args.request, ROUTES_MAP['booking.public.appointment'].href, 'Selskaps-ID mangler.');
    }

    const companyIdNumber = parseCompanyId(companyIdParam);
    if (companyIdNumber === null) {
      return redirectWithError(args.request, ROUTES_MAP['booking.public.appointment'].href, 'Selskaps-ID er ugyldig.');
    }

    await AppointmentsController.validateCompanyBooking({
      path: {
        companyId: companyIdNumber,
      },
    });

    const created = await AppointmentSessionService.create(companyIdNumber);

    return redirect(`${ROUTES_MAP['booking.public.appointment.session.contact'].href}`, {
      headers: {
        'Set-Cookie': created.setCookieHeader,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) {
      throw error;
    }
    return redirectWithError(
      args.request,
      ROUTES_MAP['booking.public.appointment'].href,
      'Noe gikk galt under oppstart av booking. Prøv igjen.',
    );
  }
}

export default function BookingPublicAppointmentSessionRoute() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Laster booking...</span>
      </div>
    </div>
  );
}
