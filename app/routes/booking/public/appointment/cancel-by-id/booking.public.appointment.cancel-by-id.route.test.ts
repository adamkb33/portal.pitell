import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAppointmentById: vi.fn(),
  cancelMyAppointment: vi.fn(),
  getAuth: vi.fn(),
  redirectWithError: vi.fn(),
  redirectWithSuccess: vi.fn(),
  getBookingCompanySummary: vi.fn(),
}));

vi.mock('~/api/generated', () => ({
  PublicAppointmentSessionController: { getAppointmentById: mocks.getAppointmentById },
  AppointmentsController: { cancelMyAppointment: mocks.cancelMyAppointment },
}));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: (_request: Request, call: () => unknown) => call() }));
vi.mock('~/lib/auth-service', () => ({ authService: { getAuth: mocks.getAuth } }));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (error: { response?: { status?: number } }, fallback: string) => ({
    message: fallback,
    status: error?.response?.status,
  }),
}));
vi.mock('~/lib/flash-message.server', () => ({
  redirectWithError: mocks.redirectWithError,
  redirectWithSuccess: mocks.redirectWithSuccess,
}));
vi.mock('~/routes/booking/public/_utils/booking-company.server', () => ({
  getBookingCompanySummary: mocks.getBookingCompanySummary,
}));

import { action, loader } from './booking.public.appointment.cancel-by-id.route';

const GONE = 'Timen er allerede avbestilt';
const request = () =>
  new Request('https://portal.pitell.no/booking/public/appointment/cancel-by-id/7', { method: 'POST' });
const args = { request: request(), params: { appointmentId: '7' } } as never;
type Result = {
  data: { appointment: unknown; company: unknown; canCancel: boolean; error: string | null };
  init?: { status?: number };
};

const appointment = (userId: number) => ({
  id: 7,
  userId,
  startTime: new Date(Date.now() + 86_400_000).toISOString(),
  endTime: new Date(Date.now() + 87_600_000).toISOString(),
  groupedServiceGroups: [{ id: 1, companyId: 3, name: 'Klipp', services: [] }],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuth.mockResolvedValue({ id: 5 });
  mocks.redirectWithError.mockImplementation((_request, to, message) => ({ redirect: to, error: message }));
  mocks.redirectWithSuccess.mockImplementation((_request, to, message) => ({ redirect: to, success: message }));
  mocks.getBookingCompanySummary.mockResolvedValue({ id: 3, name: 'Fredrikstad Barbershop' });
});

describe('cancel appointment by id', () => {
  it('shows the owner their appointment and the salon, and lets them cancel before it starts', async () => {
    mocks.getAppointmentById.mockResolvedValue({ data: { data: appointment(5) } });
    const result = (await loader(args)) as unknown as Result;
    expect(result.data).toMatchObject({
      appointment: { id: 7 },
      company: { name: 'Fredrikstad Barbershop' },
      canCancel: true,
      error: null,
    });
    expect(mocks.getBookingCompanySummary).toHaveBeenCalledWith(3, expect.any(Request));
  });

  it('does not offer to cancel once the appointment has started', async () => {
    mocks.getAppointmentById.mockResolvedValue({
      data: { data: { ...appointment(5), startTime: new Date(Date.now() - 60_000).toISOString() } },
    });
    expect(((await loader(args)) as unknown as Result).data).toMatchObject({ canCancel: false, error: null });
  });

  it('shows someone else’s appointment as gone, the same as an unknown one', async () => {
    mocks.getAppointmentById.mockRejectedValue({ response: { status: 404 } });
    const result = (await loader(args)) as unknown as Result;
    expect(result.data).toMatchObject({ appointment: null, error: GONE });
    expect(result.init?.status).toBe(404);
  });

  it('never shows or cancels an appointment that belongs to another user', async () => {
    mocks.getAppointmentById.mockResolvedValue({ data: { data: appointment(99) } });
    expect(((await loader(args)) as unknown as Result).data).toMatchObject({ appointment: null, error: GONE });

    expect(await action(args)).toEqual({ redirect: '/booking/public/my-appointments', error: GONE });
    expect(mocks.cancelMyAppointment).not.toHaveBeenCalled();
  });

  it('refuses to cancel when the backend does not find the appointment', async () => {
    mocks.getAppointmentById.mockRejectedValue({ response: { status: 404 } });
    expect(await action(args)).toEqual({ redirect: '/booking/public/my-appointments', error: GONE });
    expect(mocks.cancelMyAppointment).not.toHaveBeenCalled();
  });

  it('cancels the owner’s appointment', async () => {
    mocks.getAppointmentById.mockResolvedValue({ data: { data: appointment(5) } });
    mocks.cancelMyAppointment.mockResolvedValue({});
    expect(await action(args)).toEqual({ redirect: '/booking/public/my-appointments', success: 'Timen er avbestilt' });
    expect(mocks.cancelMyAppointment).toHaveBeenCalledWith({ path: { appointmentId: 7 } });
  });

  it('still reports other backend errors', async () => {
    mocks.getAppointmentById.mockRejectedValue({ response: { status: 503 } });
    const result = (await loader(args)) as unknown as Result;
    expect(result.data).toMatchObject({ appointment: null, error: 'Kunne ikke hente timen' });
    expect(result.init?.status).toBe(503);
  });
});
