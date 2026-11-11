import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES_MAP, ROUTE_TREE } from '~/lib/routing/route-tree';
import { action, loader } from './company.booking.appointments.create.route';
import { parseCreateFlowQueryState, withCreateFlowQueryState } from './_utils/create-flow-query-params';

const mocks = vi.hoisted(() => {
  return {
    resolveOrCreateAppointmentCustomer: vi.fn(),
    companyUserCreateAppointment: vi.fn(),
    getAppointmentCustomers: vi.fn(),
    getBookingProfile: vi.fn(),
    getSchedule: vi.fn(),
    redirectWithSuccess: vi.fn(),
  };
});

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: vi.fn(async (_request: Request, callback: () => Promise<unknown>) => callback()),
}));

vi.mock('~/api/generated', () => ({
  CompanyUserController: {
    resolveOrCreateAppointmentCustomer: mocks.resolveOrCreateAppointmentCustomer,
  },
  CompanyUserAppointmentController: {
    companyUserCreateAppointment: mocks.companyUserCreateAppointment,
    getAppointmentCustomers: mocks.getAppointmentCustomers,
  },
  CompanyUserBookingProfileController: {
    getBookingProfile: mocks.getBookingProfile,
  },
  CompanyUserScheduleController: {
    getSchedule: mocks.getSchedule,
  },
}));

vi.mock('~/routes/company/booking/_components/customer-selector', () => ({
  CustomerSelector: () => null,
}));

vi.mock('~/routes/company/booking/_components/services-selector', () => ({
  ServicesSelector: () => null,
}));

vi.mock('~/lib/flash-message.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/flash-message.server')>()),
  redirectWithSuccess: mocks.redirectWithSuccess,
}));

describe('company.booking.appointments.create.route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirectWithSuccess.mockReturnValue({ ok: true });
    mocks.getAppointmentCustomers.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              id: 9,
              givenName: 'Ada',
              familyName: 'Lovelace',
              email: 'ada@example.com',
              emailVerified: true,
              mobileNumber: '+4712345678',
              mobileVerified: true,
            },
          ],
          page: 0,
          size: 5,
          totalElements: 1,
          totalPages: 1,
        },
      },
    });
    mocks.getBookingProfile.mockResolvedValue({ data: { services: [] } });
    mocks.getSchedule.mockResolvedValue({ data: { data: [] } });
  });

  it('registers create route without nested flow routes in route tree', () => {
    expect(ROUTES_MAP['company.booking.appointments.create']?.href).toBe('/company/booking/appointments/create');
    expect(ROUTES_MAP['company.booking.appointments.create.existing-user']).toBeUndefined();
    expect(ROUTES_MAP['company.booking.appointments.create.new-user']).toBeUndefined();

    const companyBranch = ROUTE_TREE.find((branch) => branch.id === 'company');
    const bookingBranch = companyBranch?.children?.find((branch) => branch.id === 'company.booking');
    const appointmentsBranch = bookingBranch?.children?.find((branch) => branch.id === 'company.booking.appointments');
    const createBranch = appointmentsBranch?.children?.find(
      (branch) => branch.id === 'company.booking.appointments.create',
    );

    expect(createBranch).toBeTruthy();
    expect(createBranch?.children).toBeUndefined();
  });

  it('searches customers by name when there is a search', async () => {
    const request = new Request('http://localhost/company/booking/appointments/create?customer-search=ada');

    await loader({ request } as never);

    expect(mocks.getAppointmentCustomers).toHaveBeenCalledWith({
      query: { page: 0, size: 10, sort: 'familyName', direction: 'ASC', search: 'ada' },
    });
  });

  it('shows the five newest customers without a search', async () => {
    const request = new Request('http://localhost/company/booking/appointments/create');

    await loader({ request } as never);

    expect(mocks.getAppointmentCustomers).toHaveBeenCalledWith({
      query: { page: 0, size: 5, sort: 'createdAt', direction: 'DESC' },
    });
  });

  it('remembers that the flow started in Kalender and returns there on the booked day', async () => {
    const loaded = (await loader({
      request: new Request('http://localhost/company/booking/appointments/create?fra=kalender'),
    } as never)) as { from: string | null };
    expect(loaded.from).toBe('kalender');

    mocks.companyUserCreateAppointment.mockResolvedValueOnce({ data: { message: { value: 'Avtalen er opprettet.' } } });
    const formData = new FormData();
    formData.append('userId', '55');
    formData.append('serviceIds', '1');
    formData.append('startTime', '2026-03-01T23:30:00.000Z');
    formData.append('fra', 'kalender');
    await action({
      request: new Request('http://localhost/company/booking/appointments/create', { method: 'POST', body: formData }),
    } as never);

    // 23:30 UTC on 1 March is 2 March in Oslo.
    expect(mocks.redirectWithSuccess).toHaveBeenCalledWith(
      expect.anything(),
      `${ROUTES_MAP['company.booking.schedule'].href}?date=2026-03-02`,
      'Avtalen er opprettet.',
    );
  });

  it('resolves customer then creates appointment successfully', async () => {
    mocks.resolveOrCreateAppointmentCustomer.mockResolvedValueOnce({
      data: { data: { userId: 44, status: 'RESOLVED_EXISTING' } },
    });
    mocks.companyUserCreateAppointment.mockResolvedValueOnce({
      data: { message: { value: 'Avtalen er opprettet.' } },
    });

    const formData = new FormData();
    formData.append('email', 'ada@example.com');
    formData.append('serviceIds', '1,2');
    formData.append('startTime', '2026-03-01T08:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create', {
      method: 'POST',
      body: formData,
    });

    await action({ request } as never);

    expect(mocks.resolveOrCreateAppointmentCustomer).toHaveBeenCalledWith({
      body: {
        email: 'ada@example.com',
        mobileNumber: undefined,
        givenName: undefined,
        familyName: undefined,
      },
    });
    expect(mocks.companyUserCreateAppointment).toHaveBeenCalledWith({
      body: {
        userId: 44,
        services: [
          { serviceId: 1, quantity: 1 },
          { serviceId: 2, quantity: 1 },
        ],
        startTime: '2026-03-01T08:00:00.000Z',
      },
    });
    expect(mocks.redirectWithSuccess).toHaveBeenCalledOnce();
  });

  it('skips resolver and creates appointment directly when userId is provided', async () => {
    mocks.companyUserCreateAppointment.mockResolvedValueOnce({
      data: { message: { value: 'Avtalen er opprettet.' } },
    });

    const formData = new FormData();
    formData.append('userId', '55');
    formData.append('serviceIds', '1,2');
    formData.append('startTime', '2026-03-01T08:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create', {
      method: 'POST',
      body: formData,
    });

    await action({ request } as never);

    expect(mocks.resolveOrCreateAppointmentCustomer).not.toHaveBeenCalled();
    expect(mocks.companyUserCreateAppointment).toHaveBeenCalledWith({
      body: {
        userId: 55,
        services: [
          { serviceId: 1, quantity: 1 },
          { serviceId: 2, quantity: 1 },
        ],
        startTime: '2026-03-01T08:00:00.000Z',
      },
    });
  });

  it('sends how many of each service was chosen', async () => {
    mocks.companyUserCreateAppointment.mockResolvedValueOnce({ data: { message: { value: 'Avtalen er opprettet.' } } });
    const formData = new FormData();
    formData.append('userId', '55');
    formData.append('serviceIds', '1,2');
    formData.append('antall', '1:2');
    formData.append('startTime', '2026-03-01T08:00:00.000Z');

    await action({
      request: new Request('http://localhost/company/booking/appointments/create', { method: 'POST', body: formData }),
    } as never);

    expect(mocks.companyUserCreateAppointment).toHaveBeenCalledWith({
      body: {
        userId: 55,
        services: [
          { serviceId: 1, quantity: 2 },
          { serviceId: 2, quantity: 1 },
        ],
        startTime: '2026-03-01T08:00:00.000Z',
      },
    });
  });

  it('returns resolver conflict message on 409', async () => {
    mocks.resolveOrCreateAppointmentCustomer.mockRejectedValueOnce({
      response: { status: 409 },
    });

    const formData = new FormData();
    formData.append('email', 'ada@example.com');
    formData.append('mobileNumber', '+4799999999');
    formData.append('serviceIds', '1,2');
    formData.append('startTime', '2026-03-01T08:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create', {
      method: 'POST',
      body: formData,
    });

    const result = await action({ request } as never);

    expect((result as { data: unknown }).data).toEqual({
      error: 'E-post og mobilnummer hører til forskjellige kunder. Bruk bare én av dem.',
    });
  });

  it('returns appointment conflict message on 409 after successful resolve', async () => {
    mocks.resolveOrCreateAppointmentCustomer.mockResolvedValueOnce({
      data: { data: { userId: 44, status: 'RESOLVED_EXISTING' } },
    });
    mocks.companyUserCreateAppointment.mockRejectedValueOnce({
      response: { status: 409 },
    });

    const formData = new FormData();
    formData.append('email', 'ada@example.com');
    formData.append('serviceIds', '1,2');
    formData.append('startTime', '2026-03-01T08:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create', {
      method: 'POST',
      body: formData,
    });

    const result = await action({ request } as never);

    expect((result as { data: unknown }).data).toEqual({
      error: 'Valgt tidspunkt ble nettopp opptatt. Velg et annet tidspunkt.',
    });
  });

  it('loads query state, updates it, and restores it from url params', () => {
    const initial = new URLSearchParams('userId=7&serviceIds=11,13&startTime=2026-03-01T08:00:00.000Z&givenName=Ada');
    const parsedInitial = parseCreateFlowQueryState(initial);
    expect(parsedInitial.userId).toBe(7);
    expect(parsedInitial.givenName).toBe('Ada');
    expect(parsedInitial.serviceIds).toEqual([11, 13]);

    const updated = withCreateFlowQueryState(initial, {
      familyName: 'Lovelace',
      serviceIds: [11, 13, 17],
      startTime: '2026-03-02T09:30:00.000Z',
    });
    expect(updated.get('serviceIds')).toBe('11,13,17');
    expect(updated.get('familyName')).toBe('Lovelace');

    const restored = parseCreateFlowQueryState(new URLSearchParams(updated.toString()));
    expect(restored.serviceIds).toEqual([11, 13, 17]);
    expect(restored.familyName).toBe('Lovelace');
  });
});
