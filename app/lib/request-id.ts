// The id of the server request being handled, so every log line it writes can be found with one search. The request
// middleware (request-log.server) sets it through AsyncLocalStorage; this side imports nothing from Node, so the
// logger still works in the browser, where there is no request id.
export const REQUEST_ID_STORE = Symbol.for('pitell.request-id');

export function currentRequestId(): string | undefined {
  const store = (globalThis as Record<symbol, { getStore(): string | undefined } | undefined>)[REQUEST_ID_STORE];
  return store?.getStore();
}
