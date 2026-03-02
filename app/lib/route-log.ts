import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { describeAxiosError, sanitizeForLog } from '~/lib/http-log';
import { logger } from '~/lib/logger';

type RouteArgs = LoaderFunctionArgs | ActionFunctionArgs;

type RouteLogContext = Record<string, unknown>;

function buildRequestDetails(args: RouteArgs) {
  const url = new URL(args.request.url);

  return {
    method: args.request.method,
    url: args.request.url,
    path: url.pathname,
    search: url.search,
  };
}

export function logRouteStart(kind: 'loader' | 'action', routeId: string, args: RouteArgs, context?: RouteLogContext) {
  logger.info(`[route:${kind}:${routeId}] Started`, {
    ...buildRequestDetails(args),
    ...sanitizeForLog(context ?? {}),
  });
}

export function logRouteSuccess(
  kind: 'loader' | 'action',
  routeId: string,
  args: RouteArgs,
  context?: RouteLogContext,
) {
  logger.info(`[route:${kind}:${routeId}] Succeeded`, {
    ...buildRequestDetails(args),
    ...sanitizeForLog(context ?? {}),
  });
}

export function logRouteError(
  kind: 'loader' | 'action',
  routeId: string,
  args: RouteArgs,
  error: unknown,
  context?: RouteLogContext,
) {
  logger.error(`[route:${kind}:${routeId}] Failed`, {
    ...buildRequestDetails(args),
    ...sanitizeForLog(context ?? {}),
    error: describeAxiosError(error),
  });
}
