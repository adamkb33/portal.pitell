import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAppointmentById1: vi.fn(),
  deleteAppointment: vi.fn(),
  withAuth: vi.fn(),
  resolveErrorPayload: vi.fn(),
  redirectWithError: vi.fn(),
  redirectWithSuccess: vi.fn(),
}));

vi.mock('~/api/generated', () => ({
  CompanyUserAppointmentController: {
    getAppointmentById1: mocks.getAppointmentById1,
    deleteAppointment: mocks.deleteAppointment,
  },
}));

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: mocks.withAuth,
}));

vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: mocks.resolveErrorPayload,
}));

vi.mock('~/lib/flash-message.server', () => ({
  redirectWithError: mocks.redirectWithError,
  redirectWithSuccess: mocks.redirectWithSuccess,
}));

import { action, handle, loader, parseAppointmentRouteId } from './company.booking.appointments.detail.route';

function createRequest(url = 'https://portal.pitell.no/company/booking/appointments/123', init?: RequestInit) {
  return new Request(url, init);
}

function createAppointment(id: number) {
  return {
    id,
    profileId: 1,
    userId: 10,
    user: {
      id: 10,
      givenName: 'Ada',
      familyName: 'Lovelace',
      mobileNumber: '46464646',
      email: 'ada@example.com',
    },
    startTime: '2026-07-08T10:00:00+02:00',
    endTime: '2026-07-08T10:30:00+02:00',
    groupedServiceGroups: [],
    images: [],
  };
}

function readDataResponse(response: unknown) {
  return (response as { data: unknown }).data;
}

describe('company booking appointment detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withAuth.mockImplementation((_request: Request, callback: () => unknown) => callback());
    mocks.resolveErrorPayload.mockImplementation((error: { response?: { status?: number } }, fallback: string) => ({
      message: fallback,
      status: error?.response?.status,
    }));
    mocks.redirectWithError.mockImplementation((_request: Request, url: string, message: string) => ({
      type: 'error',
      url,
      message,
    }));
    mocks.redirectWithSuccess.mockImplementation((_request: Request, url: string, message: string) => ({
      type: 'success',
      url,
      message,
    }));
  });

  it.each([
    [undefined, null],
    ['0', null],
    ['-1', null],
    ['abc', null],
    ['123', 123],
  ])('parses appointment route id %s', (value, expected) => {
    expect(parseAppointmentRouteId(value)).toBe(expected);
  });

  it('fetches the appointment directly by route param', async () => {
    const appointment = createAppointment(123);
    mocks.getAppointmentById1.mockResolvedValueOnce({ data: { data: appointment } });

    const result = await loader({
      request: createRequest(),
      params: { appointmentId: '123' },
    } as never);

    expect(mocks.getAppointmentById1).toHaveBeenCalledWith({ path: { id: 123 } });
    expect(readDataResponse(result)).toEqual({
      appointment,
      canMarkNoShow: false,
      from: null,
      returnTo: null,
      error: null,
    });
  });

  it('returns to the schedule when opened from the calendar', () => {
    expect(
      handle.up?.({
        from: 'kalender',
        returnTo: '/company/booking/schedule?date=2026-11-10',
      }),
    ).toEqual({ label: 'Kalender', href: '/company/booking/schedule', search: '?date=2026-11-10' });
  });

  it('returns a validation message for invalid route params without calling the API', async () => {
    const result = await loader({
      request: createRequest('https://portal.pitell.no/company/booking/appointments/abc'),
      params: { appointmentId: 'abc' },
    } as never);

    expect(mocks.getAppointmentById1).not.toHaveBeenCalled();
    expect(readDataResponse(result)).toEqual({
      appointment: null,
      notFound: true,
      error: 'Ugyldig timebestilling',
    });
  });

  it('maps not found responses to the expected page error', async () => {
    mocks.getAppointmentById1.mockRejectedValueOnce({ response: { status: 404 } });

    const result = await loader({
      request: createRequest('https://portal.pitell.no/company/booking/appointments/404'),
      params: { appointmentId: '404' },
    } as never);

    expect(readDataResponse(result)).toEqual({
      appointment: null,
      notFound: true,
      error: 'Fant ikke timebestillingen',
    });
  });

  it('maps the backend 400 for an unknown id to not found', async () => {
    mocks.getAppointmentById1.mockRejectedValueOnce({ response: { status: 400 } });

    const result = await loader({
      request: createRequest('https://portal.pitell.no/company/booking/appointments/999'),
      params: { appointmentId: '999' },
    } as never);

    expect(readDataResponse(result)).toEqual({
      appointment: null,
      notFound: true,
      error: 'Fant ikke timebestillingen',
    });
  });

  it('maps forbidden responses to the expected page error', async () => {
    mocks.getAppointmentById1.mockRejectedValueOnce({ response: { status: 403 } });

    const result = await loader({
      request: createRequest(),
      params: { appointmentId: '123' },
    } as never);

    expect(readDataResponse(result)).toEqual({
      appointment: null,
      notFound: true,
      error: 'Du har ikke tilgang til denne timebestillingen',
    });
  });

  it('rethrows unauthenticated errors so the auth layer can redirect back to the detail route', async () => {
    const error = { response: { status: 401 } };
    mocks.getAppointmentById1.mockRejectedValueOnce(error);

    await expect(
      loader({
        request: createRequest(),
        params: { appointmentId: '123' },
      } as never),
    ).rejects.toBe(error);
  });

  it('deletes future appointments from the detail page and redirects to the list', async () => {
    const formData = new FormData();
    formData.append('intent', 'delete');
    formData.append('id', '123');
    formData.append('startTime', '2099-07-08T10:00:00+02:00');
    formData.append('reason', 'Customer cancelled');

    const result = await action({
      request: createRequest(undefined, { method: 'POST', body: formData }),
    } as never);

    expect(mocks.deleteAppointment).toHaveBeenCalledWith({
      path: { id: 123 },
      body: { reason: 'Customer cancelled' },
    });
    expect(result).toEqual({
      type: 'success',
      url: '/company/booking/appointments',
      message: 'Timebestilling slettet',
    });
  });

  it('blocks delete attempts for completed appointments before calling the API', async () => {
    const formData = new FormData();
    formData.append('intent', 'delete');
    formData.append('id', '123');
    formData.append('startTime', '2020-07-08T10:00:00+02:00');
    formData.append('reason', 'Too late');

    const result = await action({
      request: createRequest(undefined, { method: 'POST', body: formData }),
    } as never);

    expect(mocks.deleteAppointment).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'error',
      url: 'https://portal.pitell.no/company/booking/appointments/123',
      message: 'Fullførte avtaler kan ikke slettes',
    });
  });
});
