import { createCookie } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';
import { requestLogMiddleware } from './request-log.server';

const info = vi.spyOn(console, 'info').mockImplementation(() => {});
const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const error = vi.spyOn(console, 'error').mockImplementation(() => {});

const PAGE = 'https://portal.pitell.no/booking/public/appointment/session/overview';

async function handle(rawUrl: string, response: Response, headers: Record<string, string> = {}, during?: () => void) {
  const request = new Request(rawUrl, { headers });
  const url = new URL(rawUrl.replace(/\.data(?=\?|$)/, ''));
  url.searchParams.delete('_routes');
  await requestLogMiddleware({ request, url } as never, async () => {
    during?.();
    return response;
  });
}

const lineOf = (spy: typeof info) => String(spy.mock.calls.at(-1)?.[0]);

describe('request log middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs a page load that redirects, with where to, the time and the booking session', async () => {
    const cookie = await createCookie('appointment_session').serialize('87bac2c2-session');

    await handle(
      PAGE,
      new Response(null, { status: 302, headers: { Location: '/booking/public/appointment/session/select-time' } }),
      {
        'Sec-Fetch-Mode': 'navigate',
        Cookie: cookie,
      },
    );

    expect(lineOf(info)).toMatch(
      /^\[INFO\] \[[0-9a-f]{8}\] \[request\] GET \/booking\/public\/appointment\/session\/overview page → 302 \/booking\/public\/appointment\/session\/select-time \d+ms \{"bookingSession":"87bac2c2-session"\}$/,
    );
  });

  it('tells a data request from a page load, and shows the page address', async () => {
    await handle(`${PAGE}.data?_routes=root`, new Response('', { status: 200 }));

    expect(lineOf(info)).toMatch(/\[request\] GET \/booking\/public\/appointment\/session\/overview data → 200 \d+ms$/);
  });

  it('hides query values that are not ids, since they can be secret tokens', async () => {
    await handle(
      'https://portal.pitell.no/booking/public/appointment/cancel?token=secret-cancel-token&appointmentId=5213',
      new Response('', { status: 200 }),
    );

    expect(lineOf(info)).toContain('/booking/public/appointment/cancel?token=…&appointmentId=5213');
    expect(lineOf(info)).not.toContain('secret-cancel-token');
  });

  it('is a warning for 4xx and an error for 5xx', async () => {
    await handle(PAGE, new Response('', { status: 404 }));
    await handle(PAGE, new Response('', { status: 500 }));

    expect(lineOf(warn)).toContain('→ 404');
    expect(lineOf(error)).toContain('→ 500');
  });

  it('starts every line written during the request with the same id', async () => {
    await handle(PAGE, new Response('', { status: 200 }), {}, () =>
      logger.info('[api] GET /booking-service/x 200 5ms'),
    );

    const [apiLine, requestLine] = info.mock.calls.map(([line]) => String(line));
    const id = /^\[INFO\] \[([0-9a-f]{8})\]/.exec(requestLine)?.[1];
    expect(id).toBeDefined();
    expect(apiLine).toBe(`[INFO] [${id}] [api] GET /booking-service/x 200 5ms`);
  });

  it('writes no id outside a request', () => {
    logger.info('[startup] ready');
    expect(lineOf(info)).toBe('[INFO] [startup] ready');
  });
});
