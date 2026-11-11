import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), unsubscribe: vi.fn() }));

vi.mock('~/api/generated', () => ({
  PublicUnsubscribeController: { get: mocks.get, unsubscribe: mocks.unsubscribe },
}));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (error: { status?: number }) => ({ message: 'error', status: error?.status }),
}));

import { action, headers, loader } from './marketing.public.route';

type Result = { data: Record<string, unknown>; init?: { status?: number } };
const open = (token = 'demo-1') => loader({ params: { token } } as never) as Promise<Result>;
const submit = (token = 'demo-1') => action({ params: { token } } as never) as Promise<Result>;
const info = (alreadyUnsubscribed: boolean) => ({
  data: { data: { companyName: 'Fredrikstad Barbershop', channel: 'EMAIL', alreadyUnsubscribed } },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(info(false));
  mocks.unsubscribe.mockResolvedValue(info(true));
});

describe('public unsubscribe page', () => {
  it('asks before unsubscribing, without sending anyone’s login', async () => {
    const result = await open();
    expect(mocks.get).toHaveBeenCalledWith({ path: { token: 'demo-1' }, headers: { Authorization: null } });
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
    expect(result.data).toEqual({ state: 'ask', companyName: 'Fredrikstad Barbershop', channel: 'EMAIL' });
  });

  it('says so when the person is already unsubscribed', async () => {
    mocks.get.mockResolvedValue(info(true));
    expect((await open()).data).toMatchObject({ state: 'already' });
  });

  it('unsubscribes only on POST', async () => {
    const result = await submit();
    expect(mocks.unsubscribe).toHaveBeenCalledWith({ path: { token: 'demo-1' }, headers: { Authorization: null } });
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
