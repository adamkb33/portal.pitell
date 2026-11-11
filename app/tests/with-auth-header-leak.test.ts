import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/routes/auth/_features/auth.cookies.server', () => ({
  accessTokenCookie: {
    parse: vi.fn(),
  },
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('withAuth against the real generated client (no mocks)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not leak a previous request's Authorization header onto a later unauthenticated request", async () => {
    const { accessTokenCookie } = await import('~/routes/auth/_features/auth.cookies.server');
    const { client: bookingClient } = await import('~/api/generated/client.gen');
    const { withAuth } = await import('~/api/utils/with-auth');

    vi.mocked(accessTokenCookie.parse).mockResolvedValueOnce('user-a-token');
    await withAuth(new Request('http://localhost/test', { headers: { Cookie: 'access_token=user-a-token' } }), () =>
      Promise.resolve('ok'),
    );

    vi.mocked(accessTokenCookie.parse).mockResolvedValueOnce(undefined);
    await withAuth(new Request('http://localhost/test'), () => Promise.resolve('ok'));

    const headers = bookingClient.getConfig().headers as Record<string, unknown> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });
});
