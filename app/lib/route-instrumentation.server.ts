import type { InstrumentationHandlerResult, ServerInstrumentation } from 'react-router';
import { logger } from '~/lib/logger';

const loggedErrors = new WeakSet<object>();

/** True for an error the route instrumentation already logged, so handleError does not log it twice. */
export function wasLogged(error: unknown) {
  return typeof error === 'object' && error !== null && loggedErrors.has(error);
}

/**
 * Says where a request failed: which loader, action or middleware threw, and after how long. In local development it
 * also logs every loader and action with its time, to spot slow ones. React Router wraps the real functions with
 * these; they only observe. A thrown redirect or other Response is not a failure.
 */
export const routeInstrumentation: ServerInstrumentation = {
  route(route) {
    const name = route.id.split('/').pop() ?? route.id;

    const observe =
      (kind: 'loader' | 'action' | 'middleware') => async (call: () => Promise<InstrumentationHandlerResult>) => {
        const startedAt = Date.now();
        const result = await call();
        const ms = Date.now() - startedAt;

        if (result.status === 'error') {
          loggedErrors.add(result.error);
          logger.error(`[route] ${kind} ${name} failed ${ms}ms`, { error: result.error });
        } else if (kind !== 'middleware') {
          // A middleware's time is the whole request's, which the request line already shows.
          logger.debug(`[route] ${kind} ${name} ${ms}ms`);
        }
      };

    route.instrument({ loader: observe('loader'), action: observe('action'), middleware: observe('middleware') });
  },
};
