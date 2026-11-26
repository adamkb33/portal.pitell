import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '~/api/config/env';
import { currentAccessToken, requestAccessToken } from '~/api/utils/request-auth';
import { readAccessToken } from '~/lib/auth.utils';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { authMiddleware, withoutLogin } from './auth-middleware.server';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('~/api/generated', () => ({ AuthController: { refresh: mocks.refresh } }));

const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const nowSeconds = () => Math.floor(Date.now() / 1000);
/** An access token like the backend's, expiring `inSeconds` from now (negative: already expired). */
const accessToken = (inSeconds: number) =>
  jwt.sign({ sub: '7', email: 'kunde@example.no', companyId: 1, exp: nowSeconds() + inSeconds }, ENV.JWT_SECRET);

async function cookies({ access, refresh }: { access?: string; refresh?: string }) {
  const parts: string[] = [];
  if (access) parts.push((await accessTokenCookie.serialize(access)).split(';')[0]);
  if (refresh) parts.push((await refreshTokenCookie.serialize(refresh)).split(';')[0]);
  return parts.join('; ');
}

/** Runs the middleware for one request; the "page" records what token its backend calls would carry. */
async function handle(cookie: string, respond: () => Response = () => new Response('page')) {
  const request = new Request('http://localhost/company', { headers: cookie ? { Cookie: cookie } : {} });
  const seen: { sent?: string; signedInAs?: string } = {};
  const response = (await authMiddleware({ request } as never, async () => {
    seen.sent = currentAccessToken();
    seen.signedInAs = await readAccessToken(request);
    return respond();
  })) as Response;
  return { response, seen, setCookies: response.headers.getSetCookie() };
}

function refreshAnswers(newAccessToken: string) {
  mocks.refresh.mockResolvedValueOnce({
    data: {
      data: {
        accessToken: newAccessToken,
        refreshToken: 'refresh-2',
        accessTokenExpiresAt: nowSeconds() + 3600,
        refreshTokenExpiresAt: nowSeconds() + 86400,
      },
    },
  });
}

describe('auth middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('signs every backend call of the request with a valid access token, without refreshing', async () => {
    const valid = accessToken(3600);
    const { seen, setCookies } = await handle(await cookies({ access: valid, refresh: 'refresh-1' }));

    expect(seen).toEqual({ sent: valid, signedInAs: valid });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(setCookies).toEqual([]);
  });

  it('refreshes an expired token once, before the page runs, and sends the new cookies', async () => {
    const fresh = accessToken(3600);
    refreshAnswers(fresh);

    const { seen, setCookies } = await handle(await cookies({ access: accessToken(-60), refresh: 'refresh-1' }));

    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.refresh).toHaveBeenCalledWith({ query: { companyId: 1 }, body: { refreshToken: 'refresh-1' } });
    // The page and its backend calls use the new token, not the expired one still in the request's cookie.
    expect(seen).toEqual({ sent: fresh, signedInAs: fresh });
    expect(setCookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
  });

  it('refreshes a token that expires within five minutes, before calls start failing', async () => {
    refreshAnswers(accessToken(3600));

    await handle(await cookies({ access: accessToken(120), refresh: 'refresh-1' }));

    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it('continues signed out when the refresh fails', async () => {
    mocks.refresh.mockRejectedValueOnce(new Error('Refresh token has been revoked'));

    const { seen, setCookies } = await handle(await cookies({ access: accessToken(-60), refresh: 'refresh-1' }));

    expect(seen).toEqual({ sent: undefined, signedInAs: undefined });
    expect(setCookies).toEqual([]);
    expect(String(warn.mock.calls[0]?.[0])).toContain('[auth] refresh failed, continuing signed out');
  });

  it('does nothing for a signed-out visitor', async () => {
    const { seen, setCookies } = await handle('');

    expect(seen).toEqual({ sent: undefined, signedInAs: undefined });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(setCookies).toEqual([]);
  });

  it('never undoes a sign-out or a new sign-in with the refreshed cookies', async () => {
    refreshAnswers(accessToken(3600));
    const signedOut = () =>
      new Response(null, {
        status: 302,
        headers: [
          ['Location', '/'],
          ['Set-Cookie', 'access_token=; Max-Age=0; Path=/'],
          ['Set-Cookie', 'refresh_token=; Max-Age=0; Path=/'],
        ],
      });

    const { setCookies } = await handle(await cookies({ access: accessToken(-60), refresh: 'refresh-1' }), signedOut);

    expect(setCookies).toEqual(['access_token=; Max-Age=0; Path=/', 'refresh_token=; Max-Age=0; Path=/']);
  });

  it('adds the cookies to a response whose headers cannot be changed', async () => {
    refreshAnswers(accessToken(3600));

    const { response, setCookies } = await handle(
      await cookies({ access: accessToken(-60), refresh: 'refresh-1' }),
      () => Response.redirect('http://localhost/company/booking', 302),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://localhost/company/booking');
    expect(setCookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
  });
});

describe('withoutLogin', () => {
  it('sends no token, while the page still knows who is signed in', async () => {
    const valid = accessToken(3600);
    const request = new Request('http://localhost/auth/sign-in', {
      headers: { Cookie: await cookies({ access: valid }) },
    });

    let inside: { sent?: string; signedIn?: ReturnType<typeof requestAccessToken> } = {};
    await authMiddleware({ request } as never, async () => {
      inside = withoutLogin(() => ({ sent: currentAccessToken(), signedIn: requestAccessToken() }));
      return new Response('page');
    });

    expect(inside).toEqual({ sent: undefined, signedIn: { handled: true, accessToken: valid } });
  });

  it('just runs the call outside a request', () => {
    expect(withoutLogin(() => 'ran')).toBe('ran');
  });
});

describe('outside a request (scripts, unit tests)', () => {
  it('reads the cookie and sends no token', async () => {
    const valid = accessToken(3600);
    const request = new Request('http://localhost/company', { headers: { Cookie: await cookies({ access: valid }) } });

    expect(await readAccessToken(request)).toBe(valid);
    expect(currentAccessToken()).toBeUndefined();
  });
});
