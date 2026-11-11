import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoutePlaceMent } from '~/lib/routing/route-tree';

const mocks = vi.hoisted(() => ({
  verifyAndDecodeToken: vi.fn(),
  clearAuthCookies: vi.fn(),
  getTokensFromRequest: vi.fn(),
  processTokenRefresh: vi.fn(),
  getCompanyIdFromToken: vi.fn(),
  getMe: vi.fn(),
  getPermissions: vi.fn(),
  refresh: vi.fn(),
  withAuth: vi.fn(),
  parseBookingContext: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    verifyAndDecodeToken: mocks.verifyAndDecodeToken,
    clearAuthCookies: mocks.clearAuthCookies,
    getTokensFromRequest: mocks.getTokensFromRequest,
    processTokenRefresh: mocks.processTokenRefresh,
    getCompanyIdFromToken: mocks.getCompanyIdFromToken,
  },
}));

vi.mock('~/api/generated', () => ({
  AuthController: {
    getMe: mocks.getMe,
    getPermissions: mocks.getPermissions,
    refresh: mocks.refresh,
  },
}));

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: mocks.withAuth,
}));

vi.mock('~/lib/booking-context.server', () => ({
  parseBookingContext: mocks.parseBookingContext,
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}));

import { AuthController } from '~/api/generated';
import { buildResponseData } from './root.loader';

describe('root loader response data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAndDecodeToken.mockReturnValue({ id: 1 });
    mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
    mocks.parseBookingContext.mockResolvedValue({ companyId: null, theme: 'pitell' });
  });

  it('builds system-admin sidebar navigation from auth permissions when getMe does not provide roles', async () => {
    mocks.getMe.mockRejectedValue(new Error('company context missing'));
    mocks.getPermissions.mockResolvedValue({
      data: {
        data: {
          systemRoles: ['SYSTEM_ADMIN'],
          companyRoles: [],
          products: [],
          flags: { canAccessSystemAdmin: true },
        },
      },
    });

    const response = await buildResponseData(new Request('http://localhost/system-admin'), 'access-token', null);
    const sidebarBranches = response.userNavigation[RoutePlaceMent.SIDEBAR];

    expect(AuthController.getPermissions).toHaveBeenCalledOnce();
    expect(sidebarBranches.some((branch) => branch.id === 'system-admin')).toBe(true);
  });
});
