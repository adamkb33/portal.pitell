import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  action,
  loader,
} from './company.booking.appointments.create.existing-user.route';
import {
  parseCreateFlowQueryState,
  withCreateFlowQueryState,
} from '../_utils/create-flow-query-params';

const mocks = vi.hoisted(() => {
  return {
    companyUserCreateAppointmentForExistingUser: vi.fn(),
    getAppointmentCustomers: vi.fn(),
    getBookingProfile: vi.fn(),
    getSchedule: vi.fn(),
    redirectWithSuccess: vi.fn(),
  };
});

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: vi.fn(async (_request: Request, callback: () => Promise<unknown>) => callback()),
}));

vi.mock('~/api/generated/booking', () => ({
  CompanyUserAppointmentController: {
    companyUserCreateAppointmentForExistingUser: mocks.companyUserCreateAppointmentForExistingUser,
    getAppointmentCustomers: mocks.getAppointmentCustomers,
  },
  CompanyUserBookingProfileController: {
    getBookingProfile: mocks.getBookingProfile,
  },
  CompanyUserScheduleController: {
    getSchedule: mocks.getSchedule,
  },
}));

vi.mock('~/routes/company/booking/_components/contact-selector', () => ({
  ContactSelector: () => null,
}));

vi.mock('~/routes/company/booking/_components/services-selector', () => ({
  ServicesSelector: () => null,
}));

vi.mock('~/routes/company/booking/_components/date-time-selector', () => ({
  DateTimeSelector: () => null,
}));

vi.mock('~/routes/company/_lib/flash-message.server', () => ({
  redirectWithSuccess: mocks.redirectWithSuccess,
}));

describe('company.booking.appointments.create.existing-user.route', () => {
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

  it('loads existing users from appointment customers endpoint with search filter', async () => {
    const request = new Request(
      'http://localhost/company/booking/appointments/create/existing-user?contact-page=2&contact-size=10&contact-search=ada',
    );

    await loader({ request } as never);

    expect(mocks.getAppointmentCustomers).toHaveBeenCalledWith({
      query: {
        page: 2,
        size: 10,
        sort: 'familyName',
        direction: 'ASC',
        search: 'ada',
      },
    });
  });

  it('validates and submits existing-user endpoint successfully', async () => {
    mocks.companyUserCreateAppointmentForExistingUser.mockResolvedValueOnce({
      data: { message: { value: 'Avtalen er opprettet.' } },
    });

    const formData = new FormData();
    formData.append('userId', '44');
    formData.append('serviceIds', '1,2');
    formData.append('startTime', '2026-03-01T08:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create/existing-user', {
      method: 'POST',
      body: formData,
    });

    await action({ request } as never);

    expect(mocks.companyUserCreateAppointmentForExistingUser).toHaveBeenCalledWith({
      body: {
        userId: 44,
        serviceIds: [1, 2],
        startTime: '2026-03-01T08:00:00.000Z',
      },
    });
    expect(mocks.redirectWithSuccess).toHaveBeenCalledOnce();
  });

  it('loads query state, updates it, and restores it from url params', () => {
    const initial = new URLSearchParams('userId=7&serviceIds=11,13&startTime=2026-03-01T08:00:00.000Z');
    const parsedInitial = parseCreateFlowQueryState(initial);
    expect(parsedInitial.userId).toBe(7);
    expect(parsedInitial.serviceIds).toEqual([11, 13]);

    const updated = withCreateFlowQueryState(initial, {
      serviceIds: [11, 13, 17],
      startTime: '2026-03-02T09:30:00.000Z',
    });
    expect(updated.get('serviceIds')).toBe('11,13,17');
    expect(updated.get('startTime')).toBe('2026-03-02T09:30:00.000Z');

    const restored = parseCreateFlowQueryState(new URLSearchParams(updated.toString()));
    expect(restored.serviceIds).toEqual([11, 13, 17]);
    expect(restored.startTime).toBe('2026-03-02T09:30:00.000Z');
  });

});

