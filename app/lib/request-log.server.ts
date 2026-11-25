import { AsyncLocalStorage } from 'node:async_hooks';
import { createCookie, type MiddlewareFunction } from 'react-router';
import { describePath } from '~/lib/http-log';
import { logger } from '~/lib/logger';
import { REQUEST_ID_STORE } from '~/lib/request-id';

const requestIds = new AsyncLocalStorage<string>();
(globalThis as Record<symbol, unknown>)[REQUEST_ID_STORE] = requestIds;

// Read-only twin of the booking session cookie (booking.appointment-session.service.server), so the request lines of
// one customer's booking can be found by its session id.
const bookingSessionCookie = createCookie('appointment_session');

async function readBookingSession(request: Request) {
  try {
    const sessionId = await bookingSessionCookie.parse(request.headers.get('Cookie'));
    return typeof sessionId === 'string' ? sessionId : undefined;
  } catch {
    return undefined;
  }
}

/** "data" when the app fetches a page's data (…/page.data), "page" for a full page load, "fetch" for anything else. */
function requestKind(request: Request) {
  if (new URL(request.url).pathname.endsWith('.data')) return 'data';
  return request.headers.get('Sec-Fetch-Mode') === 'navigate' ? 'page' : 'fetch';
}

/**
 * One line per server request, written when it is done: what was asked, what came back (the status and, for a
 * redirect, where to) and how long it took. Gives the request a short id that every log line it writes starts with.
 */
export const requestLogMiddleware: MiddlewareFunction<Response> = ({ request, url }, next) =>
  requestIds.run(crypto.randomUUID().slice(0, 8), async () => {
    const startedAt = Date.now();
    const response = await next();

    const location = response.headers.get('Location');
    const target = location ? ` ${describePath(new URL(location, url))}` : '';
    const line = `[request] ${request.method} ${describePath(url)} ${requestKind(request)} → ${response.status}${target} ${Date.now() - startedAt}ms`;
    const context = { bookingSession: await readBookingSession(request) };

    if (response.status >= 500) logger.error(line, context);
    else if (response.status >= 400) logger.warn(line, context);
    else logger.info(line, context);

    return response;
  });
