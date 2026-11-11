import { beforeEach, describe, expect, it, vi } from 'vitest';

const setConfig = vi.fn();
const parseAccessToken = vi.fn();

vi.mock('~/api/generated/client.gen', () => ({
  client: {
    setConfig,
  },
}));

vi.mock('~/routes/auth/_features/auth.cookies.server', () => ({
  accessTokenCookie: {
    parse: parseAccessToken,
  },
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('withAuth', () => {
  beforeEach(() => {
    setConfig.mockClear();
    parseAccessToken.mockReset();
  });

  it('sets auth header for callback and clears after completion', async () => {
    parseAccessToken.mockResolvedValue('token-123');
    const { withAuth } = await import('~/api/utils/with-auth');
    const request = new Request('http://localhost/test', {
      headers: {
        Cookie: 'access_token=token-123',
      },
    });

    const result = await withAuth(request, async () => 'ok');

    expect(result).toBe('ok');
    expect(setConfig).toHaveBeenNthCalledWith(1, { headers: { Authorization: 'Bearer token-123' } });
    // Reset must send an explicit `null`, not `{}` — the generated client's
    // mergeHeaders only clears a header when its value is null; an absent key
    // is left untouched, which silently kept the previous request's token.
    expect(setConfig).toHaveBeenLastCalledWith({ headers: { Authorization: null } });
  });

  it('clears headers when no token exists', async () => {
    parseAccessToken.mockResolvedValue(null);
    const { withAuth } = await import('~/api/utils/with-auth');
    const request = new Request('http://localhost/test');

    await withAuth(request, async () => 'ok');

    expect(setConfig).toHaveBeenNthCalledWith(1, { headers: { Authorization: null } });
    expect(setConfig).toHaveBeenLastCalledWith({ headers: { Authorization: null } });
  });
});
