import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    decodeUserInvite: vi.fn(),
    respondToUserInvite: vi.fn(),
    setAuthCookies: vi.fn(),
  };
});

vi.mock('~/api/generated/base', () => ({
  AuthController: {
    decodeUserInvite: mocks.decodeUserInvite,
    respondToUserInvite: mocks.respondToUserInvite,
  },
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    setAuthCookies: mocks.setAuthCookies,
  },
}));

import { action, getContactFieldVisibility, loader } from './auth.respond-user-invite.route';

describe('auth.respond-user-invite.route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decodeUserInvite.mockResolvedValue({
      data: {
        data: {
          userId: 1,
          email: 'invited@example.com',
          mobileNumber: '+4712345678',
        },
      },
    });
    mocks.setAuthCookies.mockResolvedValue(new Headers([['Set-Cookie', 'access=1']]));
  });

  it('loader throws route error when token is missing', async () => {
    await expect(
      loader({ request: new Request('http://localhost/auth/respond-user-invite') } as never),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('loader returns decoded invite payload for valid token', async () => {
    const result = await loader({
      request: new Request('http://localhost/auth/respond-user-invite?token=abc123'),
    } as never);

    expect(mocks.decodeUserInvite).toHaveBeenCalledWith({
      query: { token: 'abc123' },
    });
    expect(result).toMatchObject({
      inviteToken: 'abc123',
      invalidInvite: false,
      invite: {
        userId: 1,
        email: 'invited@example.com',
        mobileNumber: '+4712345678',
      },
    });
  });

  it('loader returns invalid invite state when decode fails', async () => {
    mocks.decodeUserInvite.mockRejectedValueOnce(new Error('invalid token'));

    const result = await loader({
      request: new Request('http://localhost/auth/respond-user-invite?token=expired'),
    } as never);

    expect(result).toMatchObject({
      inviteToken: 'expired',
      invalidInvite: true,
    });
  });

  it('visibility logic hides both contact inputs when token has email and mobile', () => {
    expect(getContactFieldVisibility({ userId: 1, email: 'a@example.com', mobileNumber: '+471' })).toEqual({
      showEmail: false,
      showMobileNumber: false,
    });
  });

  it('visibility logic shows mobile input when token has only email', () => {
    expect(getContactFieldVisibility({ userId: 1, email: 'a@example.com', mobileNumber: undefined })).toEqual({
      showEmail: false,
      showMobileNumber: true,
    });
  });

  it('visibility logic shows email input when token has only mobile', () => {
    expect(getContactFieldVisibility({ userId: 1, email: undefined, mobileNumber: '+471' })).toEqual({
      showEmail: true,
      showMobileNumber: false,
    });
  });

  it('action sets auth cookies and redirects on successful submit', async () => {
    mocks.respondToUserInvite.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresAt: 1760000000,
          refreshTokenExpiresAt: 1760003600,
        },
      },
    });

    const formData = new FormData();
    formData.append('givenName', '  Ada  ');
    formData.append('familyName', '  Lovelace  ');
    formData.append('password', 'secret123');
    formData.append('password2', 'secret123');

    const response = await action({
      request: new Request('http://localhost/auth/respond-user-invite?token=abc123', {
        method: 'POST',
        body: formData,
      }),
    } as never);

    expect(mocks.respondToUserInvite).toHaveBeenCalledWith({
      path: { inviteToken: 'abc123' },
      body: {
        givenName: 'Ada',
        familyName: 'Lovelace',
        password: 'secret123',
        password2: 'secret123',
      },
    });
    expect(mocks.setAuthCookies).toHaveBeenCalledOnce();
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/');
  });

  it('action returns client-side error when passwords do not match', async () => {
    const formData = new FormData();
    formData.append('givenName', 'Ada');
    formData.append('familyName', 'Lovelace');
    formData.append('password', 'secret123');
    formData.append('password2', 'different');

    const result = await action({
      request: new Request('http://localhost/auth/respond-user-invite?token=abc123', {
        method: 'POST',
        body: formData,
      }),
    } as never);

    expect(result).toMatchObject({
      fieldErrors: {
        password2: 'Passordene må være like.',
      },
    });
    expect(mocks.respondToUserInvite).not.toHaveBeenCalled();
  });

  it('action returns client-side error when required conditional contact is missing', async () => {
    mocks.decodeUserInvite.mockResolvedValueOnce({
      data: {
        data: {
          userId: 1,
          email: 'invited@example.com',
          mobileNumber: undefined,
        },
      },
    });

    const formData = new FormData();
    formData.append('givenName', 'Ada');
    formData.append('familyName', 'Lovelace');
    formData.append('password', 'secret123');
    formData.append('password2', 'secret123');
    formData.append('mobileNumber', '');

    const result = await action({
      request: new Request('http://localhost/auth/respond-user-invite?token=abc123', {
        method: 'POST',
        body: formData,
      }),
    } as never);

    expect(result).toMatchObject({
      fieldErrors: {
        mobileNumber: 'Mobilnummer er obligatorisk.',
      },
    });
    expect(mocks.respondToUserInvite).not.toHaveBeenCalled();
  });

  it('action maps backend validation errors to field errors', async () => {
    mocks.respondToUserInvite.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: { value: 'VALIDATION_ERROR' },
          errors: [{ field: 'givenName', details: 'Fornavn mangler.' }],
        },
      },
    });

    const formData = new FormData();
    formData.append('givenName', 'Ada');
    formData.append('familyName', 'Lovelace');
    formData.append('password', 'secret123');
    formData.append('password2', 'secret123');

    const result = await action({
      request: new Request('http://localhost/auth/respond-user-invite?token=abc123', {
        method: 'POST',
        body: formData,
      }),
    } as never);

    expect(result).toMatchObject({
      formError: 'VALIDATION_ERROR',
      fieldErrors: {
        givenName: 'Fornavn mangler.',
      },
    });
  });
});
