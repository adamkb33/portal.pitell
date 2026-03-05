import { beforeEach, describe, expect, it, vi } from 'vitest';

const baseSetConfig = vi.fn();
const bookingSetConfig = vi.fn();
const timesheetSetConfig = vi.fn();
const notificationSetConfig = vi.fn();
const parseAccessToken = vi.fn();

vi.mock('~/api/generated/base/client.gen', () => ({
  client: {
    setConfig: baseSetConfig,
  },
}));

vi.mock('~/api/generated/booking/client.gen', () => ({
  client: {
    setConfig: bookingSetConfig,
  },
}));

vi.mock('~/api/generated/timesheet/client.gen', () => ({
  client: {
    setConfig: timesheetSetConfig,
  },
}));

vi.mock('~/api/generated/notification/client.gen', () => ({
  client: {
    setConfig: notificationSetConfig,
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
    baseSetConfig.mockClear();
    bookingSetConfig.mockClear();
    timesheetSetConfig.mockClear();
    notificationSetConfig.mockClear();
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
    expect(baseSetConfig).toHaveBeenNthCalledWith(1, { headers: { Authorization: 'Bearer token-123' } });
    expect(bookingSetConfig).toHaveBeenNthCalledWith(1, { headers: { Authorization: 'Bearer token-123' } });
    expect(timesheetSetConfig).toHaveBeenNthCalledWith(1, { headers: { Authorization: 'Bearer token-123' } });
    expect(notificationSetConfig).toHaveBeenNthCalledWith(1, { headers: { Authorization: 'Bearer token-123' } });
    expect(baseSetConfig).toHaveBeenLastCalledWith({ headers: {} });
    expect(bookingSetConfig).toHaveBeenLastCalledWith({ headers: {} });
    expect(timesheetSetConfig).toHaveBeenLastCalledWith({ headers: {} });
    expect(notificationSetConfig).toHaveBeenLastCalledWith({ headers: {} });
  });

  it('clears headers when no token exists', async () => {
    parseAccessToken.mockResolvedValue(null);
    const { withAuth } = await import('~/api/utils/with-auth');
    const request = new Request('http://localhost/test');

    await withAuth(request, async () => 'ok');

    expect(baseSetConfig).toHaveBeenNthCalledWith(1, { headers: {} });
    expect(bookingSetConfig).toHaveBeenNthCalledWith(1, { headers: {} });
    expect(timesheetSetConfig).toHaveBeenNthCalledWith(1, { headers: {} });
    expect(notificationSetConfig).toHaveBeenNthCalledWith(1, { headers: {} });
    expect(baseSetConfig).toHaveBeenLastCalledWith({ headers: {} });
  });
});
