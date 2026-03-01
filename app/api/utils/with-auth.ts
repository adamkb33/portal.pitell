import { client as baseClient } from '~/api/generated/base/client.gen';
import { client as bookingClient } from '~/api/generated/booking/client.gen';
import { client as timesheetClient } from '~/api/generated/timesheet/client.gen';
import { client as notificationClient } from '~/api/generated/notification/client.gen';
import { accessTokenCookie } from '~/routes/auth/_features/auth.cookies.server';

export async function withAuth<T>(request: Request, callback: () => Promise<T> | T, token?: string): Promise<T> {
  const cookieHeader = request.headers.get('Cookie');
  const accessToken = token || (await accessTokenCookie.parse(cookieHeader));

  if (accessToken) {
    baseClient.setConfig({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    bookingClient.setConfig({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    timesheetClient.setConfig({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    notificationClient.setConfig({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return callback();
}
