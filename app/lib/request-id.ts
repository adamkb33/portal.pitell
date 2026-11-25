// What the logger needs to know about the server request being handled. The request middleware (request-log.server)
// sets it through AsyncLocalStorage; this side imports nothing from Node, so the logger still works in the browser,
// where there is no request.
export const REQUEST_LOG_STORE = Symbol.for('pitell.request-log');

export type RequestLogState = {
  /** Short id that every log line of the request starts with, so one search shows all it did. */
  id: string;
  /** A background read (polling, a page refreshing its own data): its routine lines are for local development only. */
  routine: boolean;
};

function current(): RequestLogState | undefined {
  const store = (globalThis as Record<symbol, { getStore(): RequestLogState | undefined } | undefined>)[
    REQUEST_LOG_STORE
  ];
  return store?.getStore();
}

export function currentRequestId(): string | undefined {
  return current()?.id;
}

export function isRoutineRequest(): boolean {
  return current()?.routine ?? false;
}
