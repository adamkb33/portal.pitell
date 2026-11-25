import { AsyncLocalStorage } from 'node:async_hooks';
import { createCookie, type MiddlewareFunction } from 'react-router';
import { describePath } from '~/lib/http-log';
import { logger } from '~/lib/logger';
import { REQUEST_LOG_STORE, type RequestLogState } from '~/lib/request-id';

const requests = new AsyncLocalStorage<RequestLogState>();
(globalThis as Record<symbol, unknown>)[REQUEST_LOG_STORE] = requests;

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

const isDataRequest = (request: Request) => new URL(request.url).pathname.endsWith('.data');

/** "data" when the app fetches a page's data (…/page.data), "page" for a full page load, "fetch" for anything else. */
function requestKind(request: Request) {
  if (isDataRequest(request)) return 'data';
  const mode = request.headers.get('Sec-Fetch-Mode');
  if (mode === 'navigate') return 'page';
  // Browsers without Sec-Fetch headers: a page load is the one that asks for HTML.
  return !mode && request.headers.get('Accept')?.includes('text/html') ? 'page' : 'fetch';
}

/**
 * A read the app does in the background: a script fetching an API route (the notification bell's poll), or a page
 * refreshing its own data (same address as the page it came from; a navigation always comes from another one). Only
 * requests that say so are counted, so a browser that sends no such headers is logged as usual.
 */
function isBackgroundRead(request: Request, url: URL) {
  if (request.method !== 'GET') return false;
  if (!isDataRequest(request)) return request.headers.get('Sec-Fetch-Dest') === 'empty';

  const referer = request.headers.get('Referer');
  if (!referer) return false;
  const from = new URL(referer);
  return from.pathname === url.pathname && from.search === url.search;
}

/**
 * One line per server request, written when it is done: what was asked, what came back (the status and, for a
 * redirect, where to) and how long it took. Gives the request a short id that every log line it writes starts with.
 * A background read that works logs only in local development; one that fails logs as usual.
 */
export const requestLogMiddleware: MiddlewareFunction<Response> = ({ request, url }, next) =>
  requests.run({ id: crypto.randomUUID().slice(0, 8), routine: isBackgroundRead(request, url) }, async () => {
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
