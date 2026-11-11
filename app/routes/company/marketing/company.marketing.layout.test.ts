import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  getPermissions: vi.fn(),
  withAuth: vi.fn(),
  redirectWithError: vi.fn(),
}));

vi.mock('~/lib/auth-service', () => ({ authService: { getUserSession: mocks.getUserSession } }));
vi.mock('~/api/generated', () => ({ AuthController: { getPermissions: mocks.getPermissions } }));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: mocks.withAuth }));
vi.mock('~/lib/flash-message.server', () => ({ redirectWithError: mocks.redirectWithError }));

import { loader, shouldRevalidate } from './company.marketing.layout';

const request = new Request('http://localhost/company/marketing/create');
const args = { request } as never;

function permissions(roles = ['ADMIN'], companyId = 100, canAccessMarketing = true) {
  return { data: { data: { companyId, companyRoles: roles, flags: { canAccessMarketing } } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserSession.mockResolvedValue({ user: { id: 1, companyId: 100 }, accessToken: 'access-token' });
  mocks.getPermissions.mockResolvedValue(permissions());
  mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
  mocks.redirectWithError.mockResolvedValue(new Response(null, { status: 302, headers: { Location: '/company' } }));
});

describe('marketing access guard', () => {
  it('allows an admin of the active company that has marketing', async () => {
    await expect(loader(args)).resolves.toBeNull();
    expect(mocks.withAuth).toHaveBeenCalledWith(request, expect.any(Function), 'access-token');
  });

  it('re-checks access on every navigation and submission except the live preview', () => {
    const form = (intent: string) => {
      const formData = new FormData();
      formData.set('intent', intent);
      return formData;
    };
    expect(shouldRevalidate({ formData: undefined })).toBe(true);
    expect(shouldRevalidate({ formData: form('send') })).toBe(true);
    expect(shouldRevalidate({ formData: form('preview') })).toBe(false);
  });

  it('redirects to the company page when the company does not have marketing', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['ADMIN'], 100, false));
    await expect(loader(args)).rejects.toMatchObject({ status: 302 });
    expect(mocks.redirectWithError).toHaveBeenCalledWith(request, '/company', expect.any(String));
  });

  it('rejects an employee', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['EMPLOYEE']));
    await expect(loader(args)).rejects.toMatchObject({ status: 302 });
  });

  it('does not accept admin permissions for a different company', async () => {
    mocks.getPermissions.mockResolvedValue(permissions(['ADMIN'], 200));
    await expect(loader(args)).rejects.toMatchObject({ status: 302 });
  });

  it('fails closed when permissions cannot be loaded', async () => {
    mocks.getPermissions.mockRejectedValue(new Error('Unavailable'));
    await expect(loader(args)).rejects.toMatchObject({ status: 302 });
  });

  it('sends a signed-out visitor to sign-in without asking for permissions', async () => {
    mocks.getUserSession.mockRejectedValue(new Error('Missing session'));
    const response = await loader(args).catch((error: unknown) => error);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).headers.get('Location')).toBe('/auth/sign-in');
    expect(mocks.getPermissions).not.toHaveBeenCalled();
  });
});
