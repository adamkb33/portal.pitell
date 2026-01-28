import { createCookie } from 'react-router';
import { PublicAppointmentSessionController, type AppointmentSessionDto } from '~/api/generated/booking';

const appointmentSessionCookie = createCookie('appointment_session', {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24,
});

export class AppointmentSessionService {
  /**
   * Create a new appointment session for a company.
   * Returns the session and a Set-Cookie header to persist the session ID.
   */
  static async create(companyId: number): Promise<{ session: AppointmentSessionDto; setCookieHeader: string }> {
    const response = await PublicAppointmentSessionController.createAppointmentSession({
      query: { companyId },
    });

    if (!response.data?.data) {
      throw new Error('Kunne ikke opprette session');
    }

    const setCookieHeader = await appointmentSessionCookie.serialize(response.data.data.sessionId);

    return { session: response.data.data, setCookieHeader };
  }

  /**
   * Get an existing appointment session from the request cookie.
   * Returns null if no session exists or the session could not be fetched.
   */
  static async get(request: Request): Promise<AppointmentSessionDto | null> {
    try {
      const cookieHeader = request.headers.get('Cookie');
      const sessionId = await appointmentSessionCookie.parse(cookieHeader);

      if (!sessionId || typeof sessionId !== 'string') {
        return null;
      }

      const response = await PublicAppointmentSessionController.getAppointmentSession({
        query: { sessionId },
      });

      if (!response.data?.data) {
        throw new Error('Kunne ikke hente session');
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof Response) {
        console.error('[AppointmentSessionService.get] failed', {
          message: error.statusText,
          status: error.status,
        });
        return null;
      }

      console.error('[AppointmentSessionService.get] failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Attach a user to the current appointment session.
   * Uses session id from cookie and marks the user as pending on the session.
   */
  static async attachUser(request: Request, userId: number): Promise<void> {
    const cookieHeader = request.headers.get('Cookie');
    const sessionId = await appointmentSessionCookie.parse(cookieHeader);

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Kunne ikke hente session-id.');
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('Ugyldig bruker-id.');
    }

    await PublicAppointmentSessionController.setPendingAppointmentSessionUser({
      path: { sessionId },
      query: { userId },
    });
  }

  /**
   * Delete session in backend and clear session cookie.
   * Returns a Set-Cookie header that expires the cookie.
   */
  static async delete(request: Request): Promise<string> {
    const cookieHeader = request.headers.get('Cookie');
    const sessionId = await appointmentSessionCookie.parse(cookieHeader);

    if (sessionId && typeof sessionId === 'string') {
      try {
        await PublicAppointmentSessionController.deleteAppointmentSession({
          query: { sessionId },
        });
      } catch (error) {
        console.error('[AppointmentSessionService.delete] failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return appointmentSessionCookie.serialize('', { maxAge: 0 });
  }
}
