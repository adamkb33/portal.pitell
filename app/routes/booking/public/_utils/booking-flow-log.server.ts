import type { AppointmentSessionDto } from '~/api/generated';
import { describeAxiosError, sanitizeForLog } from '~/lib/http-log';
import { logger } from '~/lib/logger';

type BookingLogKind = 'loader' | 'action';
type BookingLogContext = Record<string, unknown>;

type BookingFlowLogOptions = {
  request: Request;
  routeId: string;
  kind: BookingLogKind;
  step: string;
  context?: BookingLogContext;
};

type BookingBackendCallOptions = {
  request: Request;
  routeId: string;
  step: string;
  call: string;
  session?: AppointmentSessionDto | null;
  context?: BookingLogContext;
};

function getRequestContext(request: Request) {
  const url = new URL(request.url);

  return {
    method: request.method,
    url: request.url,
    path: url.pathname,
    search: url.search,
  };
}

function getResponseContext(result: unknown) {
  if (result instanceof Response) {
    return {
      responseStatus: result.status,
      redirectTo: result.headers.get('Location'),
    };
  }

  if (result && typeof result === 'object' && 'init' in (result as Record<string, unknown>)) {
    const init = (result as { init?: { status?: number; headers?: HeadersInit } }).init;
    const headers = new Headers(init?.headers);

    return {
      responseStatus: init?.status ?? 200,
      redirectTo: headers.get('Location'),
    };
  }

  return {
    responseStatus: 200,
    redirectTo: null,
  };
}

export function getBookingSessionLogContext(session?: AppointmentSessionDto | null): BookingLogContext {
  if (!session) {
    return {};
  }

  return {
    sessionId: session.sessionId,
    companyId: session.companyId,
    userId: session.userId ?? null,
    selectedProfileId: session.selectedProfileId ?? null,
    selectedServicesCount: session.selectedServices?.length ?? 0,
    hasSelectedStartTime: Boolean(session.selectedStartTime),
  };
}

function toLogContext(context: BookingLogContext) {
  return sanitizeForLog(context) as BookingLogContext;
}

export async function withBookingFlowLog<T>(options: BookingFlowLogOptions, callback: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  const baseContext = toLogContext({
    ...getRequestContext(options.request),
    step: options.step,
    ...options.context,
  });

  logger.info(`[booking:${options.kind}:${options.routeId}] Started`, baseContext);

  try {
    const result = await callback();
    const durationMs = Date.now() - startedAt;

    logger.info(`[booking:${options.kind}:${options.routeId}] Succeeded`, {
      ...baseContext,
      ...getResponseContext(result),
      durationMs,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logger.error(`[booking:${options.kind}:${options.routeId}] Failed`, {
      ...baseContext,
      durationMs,
      error: describeAxiosError(error),
    });

    throw error;
  }
}

export async function withBookingBackendCall<T>(
  options: BookingBackendCallOptions,
  callback: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  const baseContext = toLogContext({
    ...getRequestContext(options.request),
    step: options.step,
    call: options.call,
    ...getBookingSessionLogContext(options.session),
    ...options.context,
  });

  logger.info(`[booking:call:${options.routeId}:${options.call}] Started`, baseContext);

  try {
    const result = await callback();
    const durationMs = Date.now() - startedAt;

    logger.info(`[booking:call:${options.routeId}:${options.call}] Succeeded`, {
      ...baseContext,
      durationMs,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logger.error(`[booking:call:${options.routeId}:${options.call}] Failed`, {
      ...baseContext,
      durationMs,
      error: describeAxiosError(error),
    });

    throw error;
  }
}
