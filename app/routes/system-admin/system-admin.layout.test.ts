import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  getPermissions: vi.fn(),
  redirectWithError: vi.fn(),
  withAuth: vi.fn(),
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    getUserSession: mocks.getUserSession,
  },
}));

vi.mock('~/api/generated', () => ({
  AuthController: {
    getPermissions: mocks.getPermissions,
  },
}));

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: mocks.withAuth,
}));

vi.mock('~/lib/flash-message.server', () => ({
  redirectWithError: mocks.redirectWithError,
}));

import { AuthController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { loader } from './system-admin.layout';

const request = new Request('http://localhost/system-admin');

describe('system-admin layout guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserSession.mockResolvedValue({ accessToken: 'access-token' });
    mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
    mocks.redirectWithError.mockResolvedValue(new Response(null, { status: 302, headers: { Location: '/company' } }));
  });

  it('allows users with the SYSTEM_ADMIN role and system-admin access flag', async () => {
    mocks.getPermissions.mockResolvedValue({
      data: {
        data: {
          flags: { canAccessSystemAdmin: true },
          systemRoles: ['SYSTEM_ADMIN'],
        },
      },
    });

    await expect(loader({ request } as never)).resolves.toBeNull();
    expect(withAuth).toHaveBeenCalledWith(request, expect.any(Function), 'access-token');
    expect(AuthController.getPermissions).toHaveBeenCalledOnce();
  });

  it('rejects authenticated users without the SYSTEM_ADMIN role', async () => {
    mocks.getPermissions.mockResolvedValue({
      data: {
        data: {
          flags: { canAccessSystemAdmin: true },
          systemRoles: [],
        },
      },
    });

    await expect(loader({ request } as never)).rejects.toMatchObject({ status: 302 });
    expect(mocks.redirectWithError).toHaveBeenCalledWith(
      request,
      '/company',
      'Du har ikke tilgang til systemadministrasjon.',
    );
  });

  it('rejects users with the role when the backend access flag is false', async () => {
    mocks.getPermissions.mockResolvedValue({
      data: {
        data: {
          flags: { canAccessSystemAdmin: false },
          systemRoles: ['SYSTEM_ADMIN'],
        },
      },
    });

    await expect(loader({ request } as never)).rejects.toMatchObject({ status: 302 });
  });
});
