import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  action,
} from './company.booking.appointments.create.new-user.route';

const mocks = vi.hoisted(() => {
  return {
    companyUserCreateAppointmentForNewUser: vi.fn(),
    redirectWithSuccess: vi.fn(),
  };
});

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: vi.fn(async (_request: Request, callback: () => Promise<unknown>) => callback()),
}));

vi.mock('~/api/generated/booking', () => ({
  CompanyUserAppointmentController: {
    companyUserCreateAppointmentForNewUser: mocks.companyUserCreateAppointmentForNewUser,
  },
  CompanyUserBookingProfileController: {
    getBookingProfile: vi.fn(),
  },
  CompanyUserScheduleController: {
    getSchedule: vi.fn(),
  },
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

describe('company.booking.appointments.create.new-user.route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirectWithSuccess.mockReturnValue({ ok: true });
  });

  it('submits new-user endpoint successfully', async () => {
    mocks.companyUserCreateAppointmentForNewUser.mockResolvedValueOnce({
      data: { message: { value: 'Avtalen er opprettet.' } },
    });

    const formData = new FormData();
    formData.append('email', 'new.user@example.com');
    formData.append('mobileNumber', '');
    formData.append('serviceIds', '3,4');
    formData.append('startTime', '2026-03-05T12:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create/new-user', {
      method: 'POST',
      body: formData,
    });

    await action({ request } as never);

    expect(mocks.companyUserCreateAppointmentForNewUser).toHaveBeenCalledWith({
      body: {
        email: 'new.user@example.com',
        mobileNumber: undefined,
        serviceIds: [3, 4],
        startTime: '2026-03-05T12:00:00.000Z',
      },
    });
    expect(mocks.redirectWithSuccess).toHaveBeenCalledOnce();
  });

  it('returns duplicate-contact guidance with preserved service and startTime', async () => {
    mocks.companyUserCreateAppointmentForNewUser.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          message: { id: 'CONFLICT', value: 'CONFLICT' },
          errors: [{ details: 'Contact already exists' }],
        },
      },
    });

    const formData = new FormData();
    formData.append('email', 'existing.user@example.com');
    formData.append('mobileNumber', '+4712345678');
    formData.append('serviceIds', '9,10');
    formData.append('startTime', '2026-03-07T14:00:00.000Z');

    const request = new Request('http://localhost/company/booking/appointments/create/new-user', {
      method: 'POST',
      body: formData,
    });

    const result = await action({ request } as never);
    expect(result).toMatchObject({
      duplicateContact: true,
    });

    const switchHref = (result as { switchHref?: string }).switchHref ?? '';
    expect(switchHref).toContain('/company/booking/appointments/create/existing-user');
    expect(switchHref).toContain('serviceIds=9%2C10');
    expect(switchHref).toContain('startTime=2026-03-07T14%3A00%3A00.000Z');
  });

});

