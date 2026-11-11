import { useState } from 'react';
import { data, Link } from 'react-router';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Clock3 } from 'lucide-react';
import type { Route } from './+types/company.notifications.view.route';
import {
  CompanyUserAppointmentController,
  CompanyUserInAppNotificationController,
  type AppointmentDto,
  type InAppNotificationDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import type { TitleHandle } from '~/lib/routing/up-link';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, Notice } from '~/ui';
import { AppointmentListRow } from '~/routes/company/booking/appointments/_components/appointment.list-row';
import { NotificationTile } from '../_components/notification-row';
import {
  notificationAppointmentId,
  notificationMessage,
  notificationReceivedAt,
  notificationTitle,
} from '../_utils/notification-display';

type LoaderData = {
  notification: InAppNotificationDto | null;
  appointment: AppointmentDto | null;
  error: string | null;
};

/** The header names the notification ("Ny timebestilling"), not the route ("Vis varsel"). */
export const handle: TitleHandle = {
  title: (loaderData) => {
    const notification = (loaderData as LoaderData | undefined)?.notification;
    return notification ? notificationTitle(notification) : null;
  },
};

function parseNotificationId(idParam: string | undefined): number | null {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const id = parseNotificationId(params.id);
  if (id == null) {
    return data<LoaderData>({ notification: null, appointment: null, error: 'Ugyldig varsel' }, { status: 400 });
  }

  try {
    const response = await withAuth(request, () =>
      CompanyUserInAppNotificationController.getInAppNotificationById({ path: { id } }),
    );
    let notification = response.data?.data ?? null;
    if (!notification) {
      return data<LoaderData>({ notification: null, appointment: null, error: 'Fant ikke varselet' }, { status: 404 });
    }

    // Opening a notification reads it.
    if (!notification.readAt) {
      const marked = await withAuth(request, () =>
        CompanyUserInAppNotificationController.markInAppNotificationAsRead({ path: { id } }),
      );
      notification = marked.data?.data ?? notification;
    }

    return data<LoaderData>({ notification, appointment: await loadAppointment(request, notification), error: null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente varselet');
    return data<LoaderData>({ notification: null, appointment: null, error: message }, { status: status ?? 500 });
  }
}

/** The appointment the notification is about. Gone (deleted) or out of reach is fine: the page just shows the message. */
async function loadAppointment(request: Request, notification: InAppNotificationDto): Promise<AppointmentDto | null> {
  const appointmentId = notificationAppointmentId(notification);
  if (appointmentId == null) return null;
  try {
    const response = await withAuth(request, () =>
      CompanyUserAppointmentController.getAppointmentById1({ path: { id: appointmentId } }),
    );
    return response.data?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * One notification (approved sketch 2026-11-10): its tile, title, when it arrived and the message, then the
 * appointment it is about as the same row as in Timebestillinger. The way back is the header's ‹ / breadcrumb.
 */
export default function CompanyNotificationsViewRoute({ loaderData }: Route.ComponentProps) {
  const { notification, appointment, error } = loaderData;
  const [now] = useState(() => new Date());

  if (error || !notification) {
    return (
      <CompanyPageTemplate title="Varsel">
        <Notice
          tone="emphasis"
          title={error ?? 'Fant ikke varselet'}
          message="Varselet kan være slettet."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={ROUTES_MAP['company.notifications'].href}>Til varsler</Link>
            </Button>
          }
        />
      </CompanyPageTemplate>
    );
  }

  const message = notificationMessage(notification.content);

  return (
    <CompanyPageTemplate title={notificationTitle(notification)}>
      <section
        aria-label="Varsel"
        className="flex w-full max-w-[32rem] flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:p-5"
      >
        <div className="flex items-center gap-3">
          <NotificationTile notification={notification} />
          <h2 className="min-w-0 text-2xl font-bold tracking-tight text-text-primary">
            {notificationTitle(notification)}
          </h2>
        </div>
        {notification.createdAt ? (
          <p className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Clock3 className="size-4 shrink-0" aria-hidden />
            <time dateTime={notification.createdAt} className="first-letter:uppercase">
              {notificationReceivedAt(notification.createdAt)}
            </time>
          </p>
        ) : null}
        {message ? <p className="text-base leading-relaxed whitespace-pre-line text-text-primary">{message}</p> : null}
      </section>

      {appointment ? (
        <section
          aria-label="Avtalen"
          className="w-full max-w-[32rem] overflow-hidden rounded-xl border border-border bg-background"
        >
          <h3 className="border-b border-border bg-slate-100 px-4 py-1.5 text-xs font-semibold text-text-primary first-letter:uppercase sm:px-5">
            {format(parseISO(appointment.startTime), 'EEEE d. MMM', { locale: nb })}
          </h3>
          <AppointmentListRow
            appointment={appointment}
            href={ROUTES_MAP['company.booking.appointments.detail'].href.replace(
              ':appointmentId',
              String(appointment.id),
            )}
            marker={new Date(appointment.endTime) < now ? 'past' : null}
          />
        </section>
      ) : null}
    </CompanyPageTemplate>
  );
}
