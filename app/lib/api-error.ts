import { describeAxiosError } from '~/lib/http-log';
import { logger } from '~/lib/logger';

export type ErrorPayloadResult = {
  message: string;
  status?: number;
  /** The backend's message id, for example `CHALLENGE_RATE_LIMITED`. */
  code?: string;
  /** Facts the backend sends with some errors, for example `retryAfterSeconds`. */
  details?: Record<string, unknown>;
};

export const resolveErrorPayload = (error: unknown, fallbackMessage: string): ErrorPayloadResult => {
  const responseError = error as {
    response?: { status?: number; data?: { message?: string | { id?: string }; data?: unknown } };
  };
  const rawMessage = responseError?.response?.data?.message;
  const message =
    typeof rawMessage === 'string'
      ? rawMessage
      : rawMessage && typeof rawMessage === 'object'
        ? (rawMessage as { value?: string; id?: string }).value || (rawMessage as { id?: string }).id
        : undefined;

  // A failed backend call is already logged by the API client (status and backend message); anything else is not.
  if (!responseError?.response) {
    logger.error('[api-error] Non-backend error', { fallbackMessage, error: describeAxiosError(error) });
  }

  const details = responseError?.response?.data?.data;

  return {
    message: message || fallbackMessage,
    status: responseError?.response?.status,
    code: rawMessage && typeof rawMessage === 'object' ? rawMessage.id : undefined,
    details: details && typeof details === 'object' ? (details as Record<string, unknown>) : undefined,
  };
};

const NETWORK_ERROR_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ERR_NETWORK',
  'ECONNABORTED',
];

/** True when the backend cannot be reached or answers with a server error (not a 4xx the user can fix). */
export const isBackendDown = (error: unknown): boolean => {
  const axiosError = error as { isAxiosError?: boolean; code?: string; response?: { status?: number } };
  if (!axiosError?.isAxiosError) return false;
  const status = axiosError.response?.status;
  if (status === undefined) return !axiosError.code || NETWORK_ERROR_CODES.includes(axiosError.code);
  return status >= 500;
};
