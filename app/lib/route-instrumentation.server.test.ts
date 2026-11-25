import type { InstrumentationHandlerResult } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleError } from '~/entry.server';
import { routeInstrumentation, wasLogged } from './route-instrumentation.server';

const error = vi.spyOn(console, 'error').mockImplementation(() => {});

type Observe = (call: () => Promise<InstrumentationHandlerResult>) => Promise<void>;

function instrumentRoute(id: string) {
  let observers: Record<string, Observe> = {};
  routeInstrumentation.route?.({
    id,
    index: false,
    path: undefined,
    instrument: (instrumentations) => {
      observers = instrumentations as Record<string, Observe>;
    },
  });
  return observers;
}

const failed = (cause: Error) => async () => ({ status: 'error' as const, error: cause });
const succeeded = async () => ({ status: 'success' as const, error: undefined });
const request = (url: string) => new Request(url);

describe('route instrumentation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs which loader failed, after how long, and why', async () => {
    const observers = instrumentRoute(
      'routes/booking/public/appointment/session/overview/booking.public.appointment.session.overview.route',
    );
    const cause = new Error('Backend unreachable');

    await observers.loader(failed(cause));

    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0][0])).toMatch(
      /^\[ERROR\] \[route\] loader booking\.public\.appointment\.session\.overview\.route failed \d+ms \{"error":\{"name":"Error","message":"Backend unreachable"/,
    );
    expect(wasLogged(cause)).toBe(true);
  });

  it('logs nothing in production for a loader or action that worked', async () => {
    const observers = instrumentRoute('routes/x.route');

    await observers.loader(succeeded);
    await observers.action(succeeded);

    expect(error).not.toHaveBeenCalled();
  });
});

describe('handleError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs an unexpected error once, as one short line', () => {
    handleError(new Error('Render failed'), {
      request: request('https://portal.pitell.no/company/booking'),
      params: {},
      context: undefined,
    } as never);

    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0][0])).toMatch(
      /^\[ERROR\] \[error\] GET \/company\/booking \{"error":\{"name":"Error","message":"Render failed"/,
    );
  });

  it('skips an error the route instrumentation already logged', async () => {
    const cause = new Error('Loader failed');
    await instrumentRoute('routes/y.route').loader(failed(cause));
    vi.clearAllMocks();

    handleError(cause, { request: request('https://portal.pitell.no/y'), params: {}, context: undefined } as never);

    expect(error).not.toHaveBeenCalled();
  });

  it('skips a request the browser already gave up on', () => {
    const controller = new AbortController();
    controller.abort();

    handleError(new Error('Too late'), {
      request: new Request('https://portal.pitell.no/z', { signal: controller.signal }),
      params: {},
      context: undefined,
    } as never);

    expect(error).not.toHaveBeenCalled();
  });
});
