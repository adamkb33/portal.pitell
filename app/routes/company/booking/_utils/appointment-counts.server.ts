import { CompanyUserAppointmentController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { formatCurrentDateTimeInTimeZone, formatDateBoundaryInTimeZone } from '~/lib/query';

/** How many avtaler a date range holds: the appointment list's own total, so a card matches the page it opens. */
async function countAppointments(request: Request, fromDateTime: string, toDateTime?: string): Promise<number | null> {
  try {
    const response = await withAuth(request, () =>
      CompanyUserAppointmentController.getAppointments({
        query: { page: 0, size: 1, fromDateTime, ...(toDateTime ? { toDateTime } : {}) },
      }),
    );
    return response.data?.data?.totalElements ?? null;
  } catch {
    return null;
  }
}

const osloToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());

/**
 * Today's avtaler (Kalender) and the upcoming ones (Timebestillinger), for the overview cards. A count that can't be
 * loaded is null: the card still opens its page.
 */
export async function countTodayAndUpcomingAppointments(
  request: Request,
): Promise<{ todayCount: number | null; upcomingCount: number | null }> {
  const today = osloToday();
  const [todayCount, upcomingCount] = await Promise.all([
    countAppointments(
      request,
      formatDateBoundaryInTimeZone(today, 'start'),
      formatDateBoundaryInTimeZone(today, 'end'),
    ),
    countAppointments(request, formatCurrentDateTimeInTimeZone()),
  ]);
  return { todayCount, upcomingCount };
}
