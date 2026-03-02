import { logger } from '~/lib/logger';
import { describeAxiosError, sanitizeForLog } from '~/lib/http-log';

export type RouteErrorPayload = {
  message: string;
  code?: string;
  details?: string;
  fieldErrors?: Record<string, string[]>;
};

export type RouteData<T extends Record<string, unknown>, E extends Record<string, unknown> = {}> =
  | ({ ok: true } & T)
  | ({ ok: false; error: RouteErrorPayload } & E);

export type ErrorPayloadResult = {
  message: string;
  status?: number;
};

export const resolveErrorPayload = (error: unknown, fallbackMessage: string): ErrorPayloadResult => {
  const responseError = error as { response?: { status?: number; data?: { message?: string } } };
  const rawMessage = responseError?.response?.data?.message;
  const message =
    typeof rawMessage === 'string'
      ? rawMessage
      : rawMessage && typeof rawMessage === 'object'
        ? (rawMessage as { value?: string; id?: string }).value || (rawMessage as { id?: string }).id
        : undefined;

  if (responseError?.response) {
    logger.error('[api-error] Axios request failed', describeAxiosError(error));
  } else {
    logger.error('[api-error] Non-Axios error', {
      fallbackMessage,
      error: sanitizeForLog(error),
    });
  }

  return {
    message: message || fallbackMessage,
    status: responseError?.response?.status,
  };
};
