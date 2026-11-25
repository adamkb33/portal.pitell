import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  getPermissions: vi.fn(),
  getLoyaltyRule: vi.fn(),
  getAppointments: vi.fn(),
  withAuth: vi.fn(),
  redirectWithError: vi.fn(),
}));

vi.mock('~/lib/auth-service', () => ({ authService: { getUserSession: mocks.getUserSession } }));
vi.mock('~/api/generated', () => ({
  AuthController: { getPermissions: mocks.getPermissions },
  Booking: { getLoyaltyRule: mocks.getLoyaltyRule },
  CompanyUserAppointmentController: { getAppointments: mocks.getAppointments },
}));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: mocks.withAuth }));
vi.mock('~/lib/flash-message.server', () => ({ redirectWithError: mocks.redirectWithError }));

import { requireBookingAdmin } from '~/lib/company-admin.server';
import { middleware as apiMiddleware } from '~/routes/api/company/booking/admin/company.booking.admin.api-route';
import { loader, middleware, shouldRevalidate } from './company.booking.admin.layout';
import { loader as bookingLoader } from '../company.booking.route';

const request = new Request('http://localhost/company/booking/admin/service-groups');
const args = { request } as never;
const next = vi.fn(async () => new Response('page'));
const check = async () => requireBookingAdmin(args, next);

function permissions(roles = ['ADMIN'], companyId = 100, canAccessBooking = true) {
  return { data: { data: { companyId, companyRoles: roles, flags: { canAccessBooking } } } };
}

// The overview's key destinations: today's avtaler (a range with an end) and the upcoming ones (open-ended).
const counts = { todayCount: 2, upcomingCount: 7 };
const noCounts = { todayCount: null, upcomingCount: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserSession.mockResolvedValue({ user: { id: 1, companyId: 100 }, accessToken: 'access-token' });
  mocks.getPermissions.mockResolvedValue(permissions());
  mocks.getLoyaltyRule.mockResolvedValue({ data: { data: { visitsRequired: 5, enabled: true } } });
  mocks.getAppointments.mockImplementation(async ({ query }: { query: { toDateTime?: string } }) => ({
    data: { data: { totalElements: query.toDateTime ? counts.todayCount : counts.upcomingCount } },
  }));
  mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
  mocks.redirectWithError.mockResolvedValue(
    new Response(null, { status: 302, headers: { Location: '/company/booking' } }),
  );
});

describe('booking admin access', () => {
  it('allows the active company admin and exposes direct admin cards', async () => {
    await expect(check()).resolves.toMatchObject({ status: 200 });
    expect(next).toHaveBeenCalledOnce();
    // Admins also get the loyalty program's state for its row on the overview.
    await expect(bookingLoader(args)).resolves.toEqual({
      canAdminister: true,
      loyalty: { visitsRequired: 5, enabled: true },
      ...counts,
    });
    expect(mocks.withAuth).toHaveBeenCalledWith(request, expect.any(Function), 'access-token');
    expect(loader()).toBeNull();
    expect(shouldRevalidate()).toBe(true);
  });

  it('rejects an employee visiting service groups directly and hides admin cards', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['EMPLOYEE']));
    await expect(check()).rejects.toMatchObject({ status: 302 });
    expect(next).not.toHaveBeenCalled();
    await expect(bookingLoader(args)).resolves.toEqual({ canAdminister: false, loyalty: null, ...counts });
    expect(mocks.redirectWithError).toHaveBeenCalledWith(request, '/company/booking', expect.any(String));
  });

  it('checks every admin page and API route before their loaders and actions run', () => {
    expect(middleware).toEqual([requireBookingAdmin]);
    expect(apiMiddleware).toEqual([requireBookingAdmin]);
  });

  it('does not accept admin permissions for a different company', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['ADMIN'], 200));
    await expect(check()).rejects.toMatchObject({ status: 302 });
    await expect(bookingLoader(args)).resolves.toEqual({ canAdminister: false, loyalty: null, ...counts });
  });

  it('rejects admin access without the booking product', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['ADMIN'], 100, false));
    await expect(check()).rejects.toMatchObject({ status: 302 });
    await expect(bookingLoader(args)).resolves.toEqual({ canAdminister: false, loyalty: null, ...counts });
  });

  it('keeps the admin row when the loyalty rule cannot be loaded', async () => {
    mocks.getLoyaltyRule.mockRejectedValue(new Error('Unavailable'));
    await expect(bookingLoader(args)).resolves.toEqual({ canAdminister: true, loyalty: null, ...counts });
  });

  it('does not load the loyalty rule for non-admins', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['EMPLOYEE']));
    await bookingLoader(args);
    expect(mocks.getLoyaltyRule).not.toHaveBeenCalled();
  });

  it('fails closed when permissions cannot be loaded', async () => {
    mocks.getPermissions.mockRejectedValue(new Error('Unavailable'));
    await expect(check()).rejects.toMatchObject({ status: 302 });
    await expect(bookingLoader(args)).resolves.toEqual({ canAdminister: false, loyalty: null, ...noCounts });
  });

  it('requires sign-in', async () => {
    mocks.getUserSession.mockRejectedValue(new Error('Missing session'));
    await expect(check()).rejects.toMatchObject({ status: 302, headers: expect.any(Headers) });
    expect(mocks.getPermissions).not.toHaveBeenCalled();
  });
});
