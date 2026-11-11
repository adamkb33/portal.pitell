const KEY = Symbol.for('pitell.backend-status');

type BackendStatus = { down: boolean };
type StatusStore = { getStore(): BackendStatus | undefined };

/** Called by the API client when a request fails because the backend is unreachable or answers with a 5xx. */
export function reportBackendDown(): void {
  const store = (globalThis as Record<symbol, StatusStore | undefined>)[KEY]?.getStore();
  if (store) store.down = true;
}
