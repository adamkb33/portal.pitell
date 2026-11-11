import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireBookingSession: vi.fn(),
  getRequirements: vi.fn(),
  getOverview: vi.fn(),
  setPendingUser: vi.fn(),
  resumeSession: vi.fn(),
  identifyUser: vi.fn(),
  cancelContactReplacement: vi.fn(),
  hasManualContactOverride: vi.fn(),
  clearManualContactOverride: vi.fn(),
  setAuthCookies: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('~/api/generated', () => ({
  Booking: {
    cancelAppointmentSessionContactReplacement: mocks.cancelContactReplacement,
  },
  PublicAppointmentSessionController: {
    getAppointmentSessionRequirements: mocks.getRequirements,
    getAppointmentSessionOverview: mocks.getOverview,
    setPendingAppointmentSessionUser: mocks.setPendingUser,
    resumeAppointmentSession: mocks.resumeSession,
    identifyAppointmentSessionUser: mocks.identifyUser,
  },
}));

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: async (_request: Request, callback: () => unknown) => callback(),
}));

vi.mock('~/lib/auth-service', () => ({
  authService: { setAuthCookies: mocks.setAuthCookies },
}));

vi.mock('~/lib/logger', () => ({
  logger: { info: mocks.loggerInfo, error: mocks.loggerError },
}));

vi.mock('~/routes/booking/public/_utils/booking-flow-log.server', () => ({
  getBookingSessionLogContext: () => ({}),
  withBookingBackendCall: async (_context: unknown, callback: () => unknown) => callback(),
  withBookingFlowLog: async (_context: unknown, callback: () => unknown) => callback(),
}));

vi.mock('~/routes/booking/public/_utils/booking.require-authenticated-flow.server', () => ({
  requireBookingSession: mocks.requireBookingSession,
}));

vi.mock('~/routes/booking/public/_utils/booking.route-map', () => ({
  getBookingRouteMap: () => ({
    employee: '/employee',
    selectServices: '/services',
    selectTime: '/time',
    contact: '/contact',
    contactSignIn: '/contact/sign-in',
    contactVerifyMobile: '/contact/verify-mobile',
    overview: '/overview',
  }),
}));

vi.mock('./_utils/manual-contact-override.cookie.server', () => ({
  hasManualContactOverride: mocks.hasManualContactOverride,
  clearManualContactOverride: mocks.clearManualContactOverride,
}));

import { action, loader } from './booking.public.appointment.session.contact.route';

const session = {
  sessionId: 'session-1',
  companyId: 1,
  selectedProfileId: 2,
  selectedServices: [{ serviceId: 3, quantity: 1 }],
  selectedStartTime: '2026-08-25T10:00:00+02:00',
  userId: null as number | null,
};

describe('booking contact route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireBookingSession.mockResolvedValue({ session: { ...session } });
    mocks.hasManualContactOverride.mockResolvedValue(false);
    mocks.clearManualContactOverride.mockResolvedValue('booking_manual_contact=; Max-Age=0; Path=/booking');
    mocks.setAuthCookies.mockResolvedValue(new Headers());
    mocks.cancelContactReplacement.mockResolvedValue({ data: { data: null } });
  });

  it('attaches the signed-in user and skips the contact screen when contact is ready', async () => {
    mocks.getRequirements.mockResolvedValue({
      data: { data: { nextStep: 'CONTACT_FORM', canAttachAuthenticatedUser: true } },
    });
    mocks.setPendingUser.mockResolvedValue({ data: { data: { nextStep: 'DONE' } } });

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/overview');
    expect(mocks.setPendingUser).toHaveBeenCalledWith({ path: { sessionId: 'session-1' } });
  });

  it('sends an attached user directly to SMS when verification is required', async () => {
    mocks.getRequirements.mockResolvedValue({
      data: { data: { nextStep: 'CONTACT_FORM', canAttachAuthenticatedUser: true } },
    });
    mocks.setPendingUser.mockResolvedValue({ data: { data: { nextStep: 'VERIFY_MOBILE' } } });

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/contact/verify-mobile');
  });

  it('prefers a verified signed-in account over an unfinished guest SMS challenge', async () => {
    mocks.getRequirements.mockResolvedValue({
      data: {
        data: {
          nextStep: 'VERIFY_MOBILE',
          challengeId: 'guest-challenge',
          canAttachAuthenticatedUser: true,
        },
      },
    });
    mocks.setPendingUser.mockResolvedValue({ data: { data: { nextStep: 'DONE' } } });

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/overview');
    expect(mocks.setPendingUser).toHaveBeenCalledOnce();
  });

  it('keeps SMS as the next step for an anonymous guest with a pending challenge', async () => {
    mocks.getRequirements.mockResolvedValue({
      data: {
        data: {
          nextStep: 'VERIFY_MOBILE',
          challengeId: 'guest-challenge',
          canAttachAuthenticatedUser: false,
        },
      },
    });

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/contact/verify-mobile?challengeId=guest-challenge');
    expect(mocks.setPendingUser).not.toHaveBeenCalled();
  });

  it('resumes a verified session and sets refreshed auth cookies without rendering a screen', async () => {
    mocks.requireBookingSession.mockResolvedValue({ session: { ...session, userId: 9 } });
    mocks.getRequirements.mockResolvedValue({ data: { data: { nextStep: 'DONE' } } });
    mocks.resumeSession.mockResolvedValue({
      data: {
        data: {
          authTokens: {
            accessToken: 'access',
            refreshToken: 'refresh',
            accessTokenExpiresAt: 1,
            refreshTokenExpiresAt: 2,
          },
        },
      },
    });
    const authHeaders = new Headers({ 'Set-Cookie': 'access_token=access' });
    mocks.setAuthCookies.mockResolvedValue(authHeaders);

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/overview');
    expect((result as Response).headers.get('Set-Cookie')).toContain('access_token=access');
    expect(mocks.resumeSession).toHaveBeenCalledOnce();
  });

  it('renders the form without resolving account state when manual contact was chosen', async () => {
    mocks.hasManualContactOverride.mockResolvedValue(true);

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).not.toBeInstanceOf(Response);
    expect(mocks.getRequirements).not.toHaveBeenCalled();
    expect(mocks.setPendingUser).not.toHaveBeenCalled();
  });

  it('falls back to the form instead of entering a redirect loop when attach fails', async () => {
    mocks.getRequirements.mockResolvedValue({
      data: { data: { nextStep: 'CONTACT_FORM', canAttachAuthenticatedUser: true } },
    });
    mocks.setPendingUser.mockRejectedValue(new Error('attach failed'));

    const result = await loader({ request: new Request('https://portal.pitell.no/contact') } as never);

    expect(result).not.toBeInstanceOf(Response);
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it('prefills the attached contact when editing from the overview', async () => {
    mocks.requireBookingSession.mockResolvedValue({ session: { ...session, userId: 9 } });
    mocks.getOverview.mockResolvedValue({
      data: {
        data: {
          user: {
            givenName: 'Ada',
            familyName: 'Lovelace',
            mobileNumber: '+4712345678',
            email: 'ada@example.com',
          },
        },
      },
    });

    const result = await loader({ request: new Request('https://portal.pitell.no/contact?edit=1') } as never);

    expect(result).not.toBeInstanceOf(Response);
    expect(mocks.getOverview).toHaveBeenCalledWith({ query: { sessionId: 'session-1' } });
    expect((result as { data: { initialContact: unknown } }).data.initialContact).toEqual({
      givenName: 'Ada',
      familyName: 'Lovelace',
      mobileNumber: '12345678',
      email: 'ada@example.com',
    });
    expect(mocks.getRequirements).not.toHaveBeenCalled();
  });

  it('cancels contact editing without detaching the current contact', async () => {
    mocks.requireBookingSession.mockResolvedValue({ session: { ...session, userId: 9 } });
    const request = new Request('https://portal.pitell.no/contact', {
      method: 'POST',
      body: new URLSearchParams({ intent: 'cancel-edit' }),
    });

    const result = await action({ request } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/overview');
    expect(mocks.cancelContactReplacement).toHaveBeenCalledWith({ path: { sessionId: 'session-1' } });
    expect(mocks.identifyUser).not.toHaveBeenCalled();
  });

  it('returns to the overview when the backend accepts an edit without SMS', async () => {
    mocks.requireBookingSession.mockResolvedValue({ session: { ...session, userId: 9 } });
    mocks.identifyUser.mockResolvedValue({ data: { data: { nextStep: 'DONE' } } });
    const request = contactEditRequest();

    const result = await action({ request } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/overview');
    expect(mocks.identifyUser).toHaveBeenCalledOnce();
    expect(mocks.cancelContactReplacement).not.toHaveBeenCalled();
  });

  it('keeps replacement pending until a changed mobile number is verified', async () => {
    mocks.requireBookingSession.mockResolvedValue({ session: { ...session, userId: 9 } });
    mocks.identifyUser.mockResolvedValue({
      data: { data: { nextStep: 'VERIFY_MOBILE', challengeId: 'replacement-challenge' } },
    });
    const request = contactEditRequest();

    const result = await action({ request } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe(
      '/contact/verify-mobile?challengeId=replacement-challenge&replacement=1',
    );
    expect(mocks.cancelContactReplacement).not.toHaveBeenCalled();
  });
});

function contactEditRequest() {
  return new Request('https://portal.pitell.no/contact?edit=1', {
    method: 'POST',
    body: new URLSearchParams({
      intent: 'identify',
      replacement: '1',
      givenName: 'Ada',
      familyName: 'Lovelace',
      mobileNumber: '12345678',
      email: 'ada@example.com',
    }),
  });
}
