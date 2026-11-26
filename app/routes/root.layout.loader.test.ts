import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFlashMessage: vi.fn(),
  readAccessToken: vi.fn(),
  defaultResponse: vi.fn(),
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
    authService: { readAccessToken: mocks.readAccessToken },
    AuthenticationError,
  };
});

vi.mock('./_features/root.loader', () => ({
  defaultResponse: mocks.defaultResponse,
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

// Refreshing an expired sign-in happens in the auth middleware (auth-middleware.server.test.ts); the root loader
// only sees the token it settled on.
describe('root.layout loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFlashMessage.mockResolvedValue({ message: null, headers: 'flash=; Path=/; Max-Age=0' });
    mocks.defaultResponse.mockResolvedValue({ kind: 'default' });
    mocks.buildResponseData.mockResolvedValue({ kind: 'signed-in' });
  });

  it('shows the signed-out page when the request has no valid token', async () => {
    mocks.getFlashMessage.mockResolvedValueOnce({ message: 'hello', headers: 'flash=1; Path=/' });
    mocks.readAccessToken.mockResolvedValueOnce(undefined);

    const result = await loader({ request: new Request('http://localhost/') } as never);

    expect(result).toEqual({ kind: 'default' });
    expect(mocks.defaultResponse).toHaveBeenCalledWith('hello', expect.any(Request), {
      'Set-Cookie': 'flash=1; Path=/',
    });
    expect(mocks.buildResponseData).not.toHaveBeenCalled();
  });

  it('builds the signed-in page from the token the auth middleware settled on', async () => {
    mocks.readAccessToken.mockResolvedValueOnce('access-token');

    const result = await loader({ request: new Request('http://localhost/') } as never);

    expect(unwrapData(result)).toEqual({ kind: 'signed-in' });
    expect(mocks.buildResponseData).toHaveBeenCalledWith(expect.any(Request), 'access-token', null);
    expect(mocks.defaultResponse).not.toHaveBeenCalled();
  });

  it('continues signed out when the sign-in is no longer valid', async () => {
    mocks.getFlashMessage.mockRejectedValueOnce(new AuthenticationError('expired', 'expired'));

    const result = await loader({ request: new Request('http://localhost/') } as never);

    expect(result).toEqual({ kind: 'default' });
    expect(mocks.defaultResponse).toHaveBeenCalledWith(null, expect.any(Request), undefined);
    expect(mocks.loggerWarn).toHaveBeenCalledOnce();
  });

  it('rethrows unexpected errors', async () => {
    mocks.getFlashMessage.mockRejectedValueOnce(new Error('boom'));

    await expect(loader({ request: new Request('http://localhost/') } as never)).rejects.toThrow('boom');
  });
});
