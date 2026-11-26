import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), unsubscribe: vi.fn() }));

vi.mock('~/api/generated', () => ({
  PublicUnsubscribeController: { get: mocks.get, unsubscribe: mocks.unsubscribe },
}));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (error: { status?: number }) => ({ message: 'error', status: error?.status }),
}));

import jwt from 'jsonwebtoken';
import { ENV } from '~/api/config/env';
import { currentAccessToken } from '~/api/utils/request-auth';
import { authMiddleware } from '~/lib/auth-middleware.server';
import { accessTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { action, headers, loader } from './marketing.public.route';

type Result = { data: Record<string, unknown>; init?: { status?: number } };
const open = (token = 'demo-1') => loader({ params: { token } } as never) as Promise<Result>;
const submit = (token = 'demo-1') => action({ params: { token } } as never) as Promise<Result>;
const info = (alreadyUnsubscribed: boolean) => ({
  data: { data: { companyName: 'Fredrikstad Barbershop', channel: 'EMAIL', alreadyUnsubscribed } },
});

// The token each backend call would carry: none, even when the browser happens to be signed in to the portal.
const sentTokens: Array<string | undefined> = [];

/** Runs the page as a request from a browser that is signed in to the portal. */
async function signedIn<T>(run: () => Promise<T>): Promise<T> {
  const token = jwt.sign({ sub: '7', exp: Math.floor(Date.now() / 1000) + 3600 }, ENV.JWT_SECRET);
  const cookie = (await accessTokenCookie.serialize(token)).split(';')[0];
  let result!: T;
  await authMiddleware(
    { request: new Request('http://localhost/x', { headers: { Cookie: cookie } }) } as never,
    async () => {
      result = await run();
      return new Response('page');
    },
  );
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  sentTokens.length = 0;
  mocks.get.mockImplementation(async () => (sentTokens.push(currentAccessToken()), info(false)));
  mocks.unsubscribe.mockImplementation(async () => (sentTokens.push(currentAccessToken()), info(true)));
});

describe('public unsubscribe page', () => {
  it('asks before unsubscribing, without sending anyone’s login', async () => {
    const result = await signedIn(() => open());
    expect(mocks.get).toHaveBeenCalledWith({ path: { token: 'demo-1' } });
    expect(sentTokens).toEqual([undefined]);
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
    expect(result.data).toEqual({ state: 'ask', companyName: 'Fredrikstad Barbershop', channel: 'EMAIL' });
  });

  it('says so when the person is already unsubscribed', async () => {
    mocks.get.mockResolvedValue(info(true));
    expect((await open()).data).toMatchObject({ state: 'already' });
  });

  it('unsubscribes only on POST', async () => {
    const result = await signedIn(() => submit());
    expect(mocks.unsubscribe).toHaveBeenCalledWith({ path: { token: 'demo-1' } });
    expect(sentTokens).toEqual([undefined]);
    expect(result.data).toEqual({ state: 'done', companyName: 'Fredrikstad Barbershop', channel: 'EMAIL' });
  });

  it('shows an unknown or missing token as an invalid link', async () => {
    mocks.get.mockRejectedValue({ status: 404 });
    mocks.unsubscribe.mockRejectedValue({ status: 404 });
    expect(await open()).toMatchObject({ data: { state: 'invalid' }, init: { status: 404 } });
    expect(await submit()).toMatchObject({ data: { state: 'invalid' }, init: { status: 404 } });

    mocks.get.mockClear();
    expect(await open('  ')).toMatchObject({ data: { state: 'invalid' } });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('shows a general error when the backend fails', async () => {
    mocks.get.mockRejectedValue({ status: 503 });
    expect(await open()).toMatchObject({ data: { state: 'error' }, init: { status: 502 } });
  });

  it('keeps the link out of search engines and Referer headers', () => {
    expect(headers()).toEqual({ 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' });
  });
});
