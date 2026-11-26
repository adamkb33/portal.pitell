import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENV } from '~/api/config/env';
import { AuthController } from '~/api/generated';
import { client } from '~/api/generated/client.gen';
import { authMiddleware } from '~/lib/auth-middleware.server';
import { accessTokenCookie } from '~/routes/auth/_features/auth.cookies.server';

// The real generated client and API axios; only the network is replaced by a backend that answers when told to.
type Call = { path: string; authorization: string | undefined; answer: () => void };

const calls: Call[] = [];
const originalAdapter = client.instance.defaults.adapter;

client.instance.defaults.adapter = (config: InternalAxiosRequestConfig) =>
  new Promise<AxiosResponse>((resolve) => {
    const authorization = config.headers.get('Authorization');
    calls.push({
      path: new URL(config.url ?? '').pathname,
      authorization: typeof authorization === 'string' ? authorization : undefined,
      answer: () => resolve({ status: 200, statusText: 'OK', data: { success: true }, headers: {}, config }),
    });
  });

/** A valid access token for user `sub`, like the backend's. */
const tokenFor = (sub: string) =>
  jwt.sign({ sub, email: `${sub}@example.no`, exp: Math.floor(Date.now() / 1000) + 3600 }, ENV.JWT_SECRET);

/** Runs `page` as one server request signed in with `token`, through the auth middleware. */
async function serve(token: string, page: () => Promise<unknown>) {
  const cookie = (await accessTokenCookie.serialize(token)).split(';')[0];
  const request = new Request('http://localhost/company', { headers: { Cookie: cookie } });
  return authMiddleware({ request } as never, async () => {
    await page();
    return new Response('page');
  });
}

function waitingCall(path: string, authorization?: string) {
  return vi.waitFor(() => {
    const call = calls.find((entry) => entry.path === path && entry.authorization === authorization);
    if (!call) throw new Error(`no call to ${path} with ${authorization ?? 'no token'} yet`);
    return call;
  });
}

describe('backend calls of requests running at the same time', () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});

  beforeEach(() => {
    calls.length = 0;
  });

  afterAll(() => {
    client.instance.defaults.adapter = originalAdapter;
  });

  it("sends each request's own token, in parallel, and none outside a request", async () => {
    const tokenA = tokenFor('1');
    const tokenB = tokenFor('2');

    const requestA = serve(tokenA, async () => {
      await AuthController.getMe();
      await AuthController.getPermissions();
    });
    const requestB = serve(tokenB, async () => {
      await AuthController.getMe();
    });

    // Both are waiting on the backend at once: a queue would hold B back until A is done.
    const meA = await waitingCall('/base-service/auth/me', `Bearer ${tokenA}`);
    const meB = await waitingCall('/base-service/auth/me', `Bearer ${tokenB}`);

    // A call outside any request while both are in flight carries no one's token.
    const outside = AuthController.refresh({ body: { refreshToken: 'refresh' } });
    const refresh = await waitingCall('/base-service/auth/refresh');

    // A goes on after B has started, and still has its own token.
    meA.answer();
    const permissionsA = await waitingCall('/base-service/auth/permissions', `Bearer ${tokenA}`);
    meB.answer();
    refresh.answer();
    permissionsA.answer();

    await expect(Promise.all([requestA, requestB, outside])).resolves.toHaveLength(3);
    expect(calls.map(({ path, authorization }) => [path, authorization])).toEqual([
      ['/base-service/auth/me', `Bearer ${tokenA}`],
      ['/base-service/auth/me', `Bearer ${tokenB}`],
      ['/base-service/auth/refresh', undefined],
      ['/base-service/auth/permissions', `Bearer ${tokenA}`],
    ]);
    // Nothing is left on the shared client for a later request to pick up.
    expect((client.getConfig().headers as Record<string, unknown> | undefined)?.Authorization).toBeUndefined();
  });

  it('keeps an Authorization the call sets itself', async () => {
    const request = serve(tokenFor('1'), () =>
      AuthController.getCompanyContexts({ headers: { Authorization: 'Bearer just-signed-in' } }),
    );

    (await waitingCall('/base-service/auth/company-contexts', 'Bearer just-signed-in')).answer();
    await request;
    expect(calls).toHaveLength(1);
  });
});
