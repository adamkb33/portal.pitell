import { createCookie } from 'react-router';
import { PublicAppointmentSessionController, type AppointmentSessionDto } from '~/api/generated/booking';

const GATEWAY_URL = (process.env.VITE_API_GATEWAY_URL || 'http://localhost:8080').replace(/\/+$/, '');
const BOOKING_BASE_URL = `${GATEWAY_URL}/booking-service`;
const CREATE_SESSION_URL = `${BOOKING_BASE_URL}/public/appointment-session/create-session`;
const GET_SESSION_URL = `${BOOKING_BASE_URL}/public/appointment-session/get-session`;

export const appointmentSessionCookie = createCookie('appointment_session', {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24,
});

export async function createAppointmentSession(
  companyId: number,
): Promise<{ session: AppointmentSessionDto; setCookieHeader: string }> {
  console.debug('[appointments.create-session] request', {
    url: CREATE_SESSION_URL,
    companyId,
  });
  const sessionResponse = await PublicAppointmentSessionController.createAppointmentSession({
    query: {
      companyId,
    },
  });

  if (!sessionResponse.data?.data) {
    throw Error('Kunne ikke hente session');
  }

  const setCookieHeader = await appointmentSessionCookie.serialize(sessionResponse.data.data.sessionId);

  return { session: sessionResponse.data.data, setCookieHeader };
}

export async function getSession(request: Request): Promise<AppointmentSessionDto | null> {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const sessionId = await appointmentSessionCookie.parse(cookieHeader);

    if (!sessionId || typeof sessionId !== 'string') {
      console.error('[appointments.get-session] no session id', {
        cookieHeader,
        sessionId,
      });
      return null;
    }

    const sessionResponse = await PublicAppointmentSessionController.getAppointmentSession({
      query: {
        sessionId,
      },
    });

    if (!sessionResponse.data) {
      throw Error('Kunne ikke hente session');
    }

    if (!sessionResponse.data.data) {
      throw Error('Kunne ikke hente session');
    }

    return sessionResponse.data.data;
  } catch (error) {
    if (error instanceof Response) {
      let responseText = '';
      try {
        responseText = await error.clone().text();
      } catch {
        responseText = '';
      }
      console.error('[appointments.get-session] failed', {
        message: responseText || error.statusText || 'Response error',
        status: error.status,
        url: GET_SESSION_URL,
      });
      return null;
    }

    console.error('[appointments.get-session] failed', {
      message: error instanceof Error ? error.message : String(error),
      status: undefined,
      url: GET_SESSION_URL,
    });
    return null;
  }
}
