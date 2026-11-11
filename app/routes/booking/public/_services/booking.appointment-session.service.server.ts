import { createCookie } from 'react-router';
import { PublicAppointmentSessionController, type ApiMessage, type AppointmentSessionDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';

const appointmentSessionCookie = createCookie('appointment_session', {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24,
});

type AppointmentSessionGetResult =
  | { status: 'found'; session: AppointmentSessionDto }
  | { status: 'missing-cookie' }
  | { status: 'stale-cookie' }
  | { status: 'failed'; error: unknown };

function getApiMessage(error: unknown): { id: ApiMessage['id'] | null; value: string | null } {
  const candidate = error as {
    error?: { message?: { id?: unknown } };
    response?: { data?: { message?: { id?: unknown; value?: unknown } | string } };
  };

  const responseMessage = candidate.response?.data?.message;
  const id = candidate.error?.message?.id ?? (typeof responseMessage === 'object' ? responseMessage?.id : undefined);
  const value = typeof responseMessage === 'object' ? responseMessage?.value : responseMessage;

  return {
    id: typeof id === 'string' ? (id as ApiMessage['id']) : null,
    value: typeof value === 'string' ? value : null,
  };
}

function isSessionNotFoundError(error: unknown): boolean {
  const message = getApiMessage(error);
  const candidate = error as { response?: { status?: number } };
  return (
    candidate.response?.status === 404 ||
    message.id === 'SESSION_NOT_FOUND' ||
    message.id === 'SESSION_EXPIRED' ||
    message.value === 'SESSION_NOT_FOUND' ||
    message.value === 'Sesjonen finnes ikke'
  );
}

export class AppointmentSessionService {
  /**
   * Create a new appointment session for a company.
   * Returns the session and a Set-Cookie header to persist the session ID.
   */
  static async create(
    companyId: number,
    request: Request,
  ): Promise<{ session: AppointmentSessionDto; setCookieHeader: string }> {
    const response = await withAuth(request, () =>
      PublicAppointmentSessionController.createAppointmentSession({
        query: { companyId },
      }),
    );

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
    const result = await this.getResult(request);
    return result.status === 'found' ? result.session : null;
  }

  static async getResult(request: Request): Promise<AppointmentSessionGetResult> {
    try {
      const cookieHeader = request.headers.get('Cookie');
      const sessionId = await appointmentSessionCookie.parse(cookieHeader);

      if (!sessionId || typeof sessionId !== 'string') {
        return { status: 'missing-cookie' };
      }

      const response = await withAuth(request, () =>
        PublicAppointmentSessionController.getAppointmentSession({
          query: { sessionId },
        }),
      );

      if (response.error || isSessionNotFoundError(response)) {
        return isSessionNotFoundError(response)
          ? { status: 'stale-cookie' }
          : { status: 'failed', error: response.error ?? response };
      }

      if (!response.data?.data) {
        throw new Error('Kunne ikke hente session');
      }

      return { status: 'found', session: response.data.data };
    } catch (error) {
      if (isSessionNotFoundError(error)) {
        return { status: 'stale-cookie' };
      }

      if (error instanceof Response) {
        console.error('[AppointmentSessionService.get] failed', {
          message: error.statusText,
          status: error.status,
        });
        return { status: 'failed', error };
      }

      console.error('[AppointmentSessionService.get] failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return { status: 'failed', error };
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

    await withAuth(request, () =>
      PublicAppointmentSessionController.setPendingAppointmentSessionUser({
        path: { sessionId },
      }),
    );
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
        await withAuth(request, () =>
          PublicAppointmentSessionController.deleteAppointmentSession({
            query: { sessionId },
          }),
        );
      } catch (error) {
        console.error('[AppointmentSessionService.delete] failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return appointmentSessionCookie.serialize('', { maxAge: 0 });
  }
}
