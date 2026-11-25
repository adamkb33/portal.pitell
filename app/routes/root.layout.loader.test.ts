import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFlashMessage: vi.fn(),
  getTokensFromRequest: vi.fn(),
  isTokenExpired: vi.fn(),
  defaultResponse: vi.fn(),
  refreshAndBuildResponse: vi.fn(),
  buildResponseData: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('../lib/flash-message.server', () => ({
  getFlashMessage: mocks.getFlashMessage,
}));

vi.mock('~/lib/auth-service', () => {
  class AuthenticationError extends Error {
    reason: 'missing' | 'expired' | 'invalid';

    constructor(message: string, reason: 'missing' | 'expired' | 'invalid') {
      super(message);
      this.name = 'AuthenticationError';
      this.reason = reason;
    }
  }

  return {
    authService: {
      getTokensFromRequest: mocks.getTokensFromRequest,
      isTokenExpired: mocks.isTokenExpired,
    },
    AuthenticationError,
  };
});

vi.mock('./_features/root.loader', () => ({
  defaultResponse: mocks.defaultResponse,
  refreshAndBuildResponse: mocks.refreshAndBuildResponse,
  buildResponseData: mocks.buildResponseData,
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    error: mocks.loggerError,
    warn: mocks.loggerWarn,
  },
}));

import { AuthenticationError } from '~/lib/auth-service';
import { loader } from './root.layout';

function unwrapData<T = unknown>(result: unknown): T {
  if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>)) {
    return (result as { data: T }).data;
  }
  return result as T;
}

describe('root.layout loader guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFlashMessage.mockResolvedValue({ message: null, headers: 'flash=; Path=/; Max-Age=0' });
    mocks.isTokenExpired.mockReturnValue(false);
    mocks.defaultResponse.mockResolvedValue({ kind: 'default' });
    mocks.refreshAndBuildResponse.mockResolvedValue({ kind: 'refresh' });
    mocks.buildResponseData.mockResolvedValue({ kind: 'access' });
  });

  it('uses default response when no access or refresh token exists', async () => {
    mocks.getFlashMessage.mockResolvedValueOnce({ message: 'hello', headers: 'flash=1; Path=/' });
    mocks.getTokensFromRequest.mockResolvedValueOnce({ accessToken: null, refreshToken: null });

    const result = await loader({
      request: new Request('http://localhost/'),
    } as never);

    expect(result).toEqual({ kind: 'default' });
    expect(mocks.defaultResponse).toHaveBeenCalledWith('hello', expect.any(Request), expect.any(Object));
  });

  it('uses refresh path when only refresh token exists', async () => {
    mocks.getTokensFromRequest.mockResolvedValueOnce({ accessToken: null, refreshToken: 'refresh-token' });

    const request = new Request('http://localhost/');
    const result = await loader({ request } as never);

    expect(result).toEqual({ kind: 'refresh' });
    expect(mocks.refreshAndBuildResponse).toHaveBeenCalledWith(request, 'refresh-token', null, expect.any(Object));
  });

  it('uses refresh path when access token is expired and refresh token exists', async () => {
    mocks.getTokensFromRequest.mockResolvedValueOnce({ accessToken: 'expired-access', refreshToken: 'refresh-token' });
    mocks.isTokenExpired.mockReturnValueOnce(true);

    const request = new Request('http://localhost/');
    const result = await loader({ request } as never);

    expect(result).toEqual({ kind: 'refresh' });
    expect(mocks.refreshAndBuildResponse).toHaveBeenCalledWith(request, 'refresh-token', null, expect.any(Object));
  });

  it('falls back to default response when access token is expired and refresh token is missing', async () => {
    mocks.getTokensFromRequest.mockResolvedValueOnce({ accessToken: 'expired-access', refreshToken: null });
    mocks.isTokenExpired.mockReturnValueOnce(true);

    const result = await loader({
      request: new Request('http://localhost/'),
    } as never);

    expect(result).toEqual({ kind: 'default' });
    expect(mocks.defaultResponse).toHaveBeenCalledWith(null, expect.any(Request), expect.any(Object));
  });

  it('uses access-token branch when access token is valid', async () => {
    mocks.getTokensFromRequest.mockResolvedValueOnce({ accessToken: 'valid-access', refreshToken: 'refresh-token' });
    mocks.isTokenExpired.mockReturnValueOnce(false);

    const request = new Request('http://localhost/');
    const result = await loader({ request } as never);

    expect(unwrapData(result)).toEqual({ kind: 'access' });
    expect(mocks.buildResponseData).toHaveBeenCalledWith(request, 'valid-access', null);
  });

  it('returns default response when AuthenticationError is thrown', async () => {
    mocks.getFlashMessage.mockRejectedValueOnce(new AuthenticationError('expired', 'expired'));

    const result = await loader({
      request: new Request('http://localhost/'),
    } as never);

    expect(result).toEqual({ kind: 'default' });
    expect(mocks.defaultResponse).toHaveBeenCalledWith(null, expect.any(Request), undefined);
    expect(mocks.loggerWarn).toHaveBeenCalledOnce();
  });

  it('rethrows unexpected errors', async () => {
    mocks.getFlashMessage.mockRejectedValueOnce(new Error('boom'));

    await expect(
      loader({
        request: new Request('http://localhost/'),
      } as never),
    ).rejects.toThrow('boom');
  });
});
