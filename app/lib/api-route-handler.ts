import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import type { ApiError, ApiMessage } from '~/api/generated/base/types.gen';
import { withAuth } from '~/api/utils/with-auth';

type ApiEnvelope<T = unknown> = {
  success: boolean;
  message: string | ApiMessage;
  data?: T;
  errors?: ApiError[];
  meta?: unknown;
  timestamp?: string;
};

type RouteArgs = LoaderFunctionArgs | ActionFunctionArgs;

export type RouteErrorPayload = {
  message: string;
  code?: string;
  details?: string;
  fieldErrors?: Record<string, string[]>;
};

type EmptyObject = Record<never, never>;

export type RouteData<T extends object, E extends Record<string, unknown> = {}> =
  | ({ ok: true } & T)
  | ({ ok: false; error: RouteErrorPayload } & E);

type ErrorHandlingOptions = {
  fallbackMessage?: string;
  status?: number;
  log?: boolean;
  mapError?: (payload: RouteErrorPayload, error: unknown) => Record<string, unknown>;
};

type AuthOptions = boolean | { token?: string };

type RouteHandlerOptions = ErrorHandlingOptions & {
  auth?: AuthOptions;
};

type LoaderHandler<TSuccess extends object> = (
  args: LoaderFunctionArgs,
  helpers: ApiRouteHelpers,
) => Promise<TSuccess | Response | void> | TSuccess | Response | void;

type ActionHandler<TSuccess extends object> = (
  args: ActionFunctionArgs,
  helpers: ApiRouteHelpers,
) => Promise<TSuccess | Response | void> | TSuccess | Response | void;

type AxiosErrorLike = {
  isAxiosError?: boolean;
  message?: string;
  response?: { status?: number; statusText?: string; data?: unknown };
  error?: unknown;
};

const DEFAULT_MESSAGE = 'En feil oppstod';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const apiMessageToText = (message: string | ApiMessage | undefined, fallback: string): string => {
  if (!message) return fallback;
  if (typeof message === 'string') return message || fallback;
  return message.value || fallback;
};

const apiMessageToCode = (message: string | ApiMessage | undefined): string | undefined => {
  if (!message || typeof message === 'string') return undefined;
  return message.id;
};

const isApiEnvelope = (value: unknown): value is ApiEnvelope => {
  if (!isRecord(value)) return false;
  const messageValue = value.message;
  const hasValidMessage =
    typeof messageValue === 'string' ||
    (isRecord(messageValue) && typeof messageValue.id === 'string' && typeof messageValue.value === 'string');
  if (!hasValidMessage) return false;
  return 'success' in value;
};

const toFieldErrors = (errors?: ApiError[]) => {
  if (!errors || errors.length === 0) return undefined;

  return errors.reduce<Record<string, string[]>>((acc, error) => {
    if (!error.field || !error.message) return acc;
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(apiMessageToText(error.message, DEFAULT_MESSAGE));
    return acc;
  }, {});
};

const resolveApiPayload = (dataValue: unknown, fallbackMessage: string): RouteErrorPayload => {
  if (isApiEnvelope(dataValue)) {
    const errors = Array.isArray(dataValue.errors) ? dataValue.errors : undefined;
    const firstError = errors?.[0];
    const firstErrorMessage = apiMessageToText(firstError?.message, '');

    return {
      message: apiMessageToText(dataValue.message, '') || firstErrorMessage || fallbackMessage,
      code: apiMessageToCode(firstError?.message) || apiMessageToCode(dataValue.message),
      details: firstError?.details,
      fieldErrors: toFieldErrors(errors),
    };
  }

  if (isRecord(dataValue) && Array.isArray(dataValue.errors)) {
    const errors = dataValue.errors as ApiError[];
    const firstError = errors[0];

    return {
      message: apiMessageToText(firstError?.message, fallbackMessage),
      code: apiMessageToCode(firstError?.message),
      details: firstError?.details,
      fieldErrors: toFieldErrors(errors),
    };
  }

  if (isRecord(dataValue) && typeof dataValue.message === 'string') {
    return { message: dataValue.message || fallbackMessage };
  }

  return { message: fallbackMessage };
};

const normalizeError = (error: unknown, fallbackMessage: string): { payload: RouteErrorPayload; status?: number } => {
  if (error instanceof Response) {
    return {
      payload: {
        message: error.statusText || fallbackMessage,
      },
      status: error.status || 500,
    };
  }

  if (typeof error === 'string') {
    return { payload: { message: error || fallbackMessage } };
  }

  if (isRecord(error) && 'error' in error && (error as AxiosErrorLike).error !== undefined) {
    const axiosError = error as AxiosErrorLike;
    return {
      payload: resolveApiPayload(axiosError.error, fallbackMessage),
      status: axiosError.response?.status,
    };
  }

  if (isRecord(error) && 'response' in error) {
    const axiosError = error as AxiosErrorLike;
    const responseData = axiosError.response?.data;

    if (!responseData) {
      return {
        payload: { message: fallbackMessage },
        status: axiosError.response?.status,
      };
    }

    return {
      payload: resolveApiPayload(responseData, fallbackMessage),
      status: axiosError.response?.status,
    };
  }

  if (error instanceof Error) {
    return { payload: { message: error.message || fallbackMessage } };
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return { payload: { message: error.message || fallbackMessage } };
  }

  return { payload: { message: fallbackMessage } };
};

const buildRequestInfo = (args?: RouteArgs) =>
  args?.request ? `${args.request.method} ${args.request.url}` : 'Unknown request';

type ApiEnvelopeResponse<TPayload> = { data?: ApiEnvelope<TPayload> };

type ApiErrorResponse = { error: unknown; response?: { status?: number } };

export type ApiRouteHelpers = {
  requestApi<TPayload>(
    promise: Promise<ApiEnvelopeResponse<TPayload> | ApiErrorResponse>,
  ): Promise<TPayload | undefined>;
  requestApi<T>(promise: Promise<T>): Promise<T>;
};

export class ApiRouteHandler {
  constructor(private readonly defaultOptions: ErrorHandlingOptions = {}) {}

  loader<TSuccess extends object = EmptyObject>(handler: LoaderHandler<TSuccess>, options?: RouteHandlerOptions) {
    return async (args: LoaderFunctionArgs) => {
      try {
        const result = await this.runWithAuth(args, handler, options);
        if (result instanceof Response) return result;
        if (result === undefined) {
          return data<RouteData<EmptyObject>>({ ok: true });
        }
        return data<RouteData<TSuccess>>({ ok: true, ...(result as TSuccess) });
      } catch (error) {
        return this.handleError(error, args, options);
      }
    };
  }

  action<TSuccess extends object = EmptyObject>(handler: ActionHandler<TSuccess>, options?: RouteHandlerOptions) {
    return async (args: ActionFunctionArgs) => {
      try {
        const result = await this.runWithAuth(args, handler, options);
        if (result instanceof Response) return result;
        if (result === undefined) {
          return data<RouteData<EmptyObject>>({ ok: true });
        }
        return data<RouteData<TSuccess>>({ ok: true, ...(result as TSuccess) });
      } catch (error) {
        return this.handleError(error, args, options);
      }
    };
  }

  private buildHelpers(): ApiRouteHelpers {
    return {
      requestApi: async <T>(promise: Promise<T>) => {
        const result = await promise;
        if (isRecord(result) && 'error' in result && result.error !== undefined) {
          throw result;
        }
        if (isRecord(result) && 'data' in result && isApiEnvelope(result.data)) {
          const envelope = result.data as ApiEnvelope;
          if (!envelope.success || (envelope.errors && envelope.errors.length > 0)) {
            throw {
              response:
                isRecord(result) && 'status' in result ? { status: (result as { status?: number }).status } : undefined,
              error: envelope,
            };
          }
          return envelope.data as T;
        }
        return result;
      },
    };
  }

  private async runWithAuth<TSuccess extends object>(
    args: RouteArgs,
    handler: LoaderHandler<TSuccess> | ActionHandler<TSuccess>,
    options?: RouteHandlerOptions,
  ) {
    if (!options?.auth) {
      return handler(args as LoaderFunctionArgs & ActionFunctionArgs, this.buildHelpers());
    }

    const token = typeof options.auth === 'object' ? options.auth.token : undefined;
    return withAuth(
      args.request,
      () => handler(args as LoaderFunctionArgs & ActionFunctionArgs, this.buildHelpers()),
      token,
    );
  }

  private handleError(error: unknown, args: RouteArgs, options?: ErrorHandlingOptions) {
    if (error instanceof Response) {
      throw error;
    }

    const resolved = normalizeError(
      error,
      options?.fallbackMessage ?? this.defaultOptions.fallbackMessage ?? DEFAULT_MESSAGE,
    );
    const payload = resolved.payload;
    const status = options?.status ?? this.defaultOptions.status ?? resolved.status ?? 400;
    const extra = options?.mapError ? options.mapError(payload, error) : {};
    const logEnabled = options?.log ?? this.defaultOptions.log ?? true;

    if (logEnabled) {
      console.error(`[route-error] ${buildRequestInfo(args)}`, error);
    }

    return data<RouteData<Record<string, never>, Record<string, unknown>>>(
      {
        ok: false,
        error: payload,
        ...extra,
      },
      { status },
    );
  }
}

export const apiRouteHandler = new ApiRouteHandler();
