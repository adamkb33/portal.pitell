import { AsyncLocalStorage } from 'node:async_hooks';

const KEY = Symbol.for('pitell.backend-status');

const storage = new AsyncLocalStorage<{ down: boolean }>();
(globalThis as Record<symbol, unknown>)[KEY] = storage;

/** Runs one request and tells you afterwards whether any backend call made during it failed as "backend down". */
export function runWithBackendStatus<T>(run: (isDown: () => boolean) => Promise<T>): Promise<T> {
  const status = { down: false };
  return storage.run(status, () => run(() => status.down));
}
