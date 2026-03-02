import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

const MAX_STRING_LENGTH = 500;

function truncateString(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_STRING_LENGTH)}...<truncated>`;
}

function sanitizeUnknown(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ? truncateString(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[Redacted]';
        continue;
      }

      sanitized[key] = sanitizeUnknown(entry, seen);
    }

    seen.delete(value);
    return sanitized;
  }

  return String(value);
}

function buildRequestUrl(config?: AxiosRequestConfig) {
  if (!config?.url) {
    return config?.baseURL ?? null;
  }

  if (/^https?:\/\//i.test(config.url)) {
    return config.url;
  }

  if (!config.baseURL) {
    return config.url;
  }

  return `${config.baseURL.replace(/\/$/, '')}/${config.url.replace(/^\//, '')}`;
}

export function describeAxiosRequest(config?: AxiosRequestConfig) {
  return {
    method: config?.method?.toUpperCase() ?? 'GET',
    url: buildRequestUrl(config),
    baseURL: config?.baseURL ?? null,
    params: sanitizeUnknown(config?.params),
    data: sanitizeUnknown(config?.data),
    headers: sanitizeUnknown(config?.headers),
    timeout: config?.timeout ?? null,
  };
}

export function describeAxiosResponse(response: AxiosResponse) {
  return {
    status: response.status,
    statusText: response.statusText,
    url: buildRequestUrl(response.config),
    method: response.config.method?.toUpperCase() ?? 'GET',
    data: sanitizeUnknown(response.data),
    headers: sanitizeUnknown(response.headers),
  };
}

export function describeAxiosError(error: unknown) {
  const axiosError = error as AxiosError;

  return {
    message: axiosError?.message ?? 'Unknown Axios error',
    code: axiosError?.code ?? null,
    request: describeAxiosRequest(axiosError?.config),
    response: axiosError?.response
      ? {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: sanitizeUnknown(axiosError.response.data),
          headers: sanitizeUnknown(axiosError.response.headers),
        }
      : null,
    stack: axiosError?.stack ? truncateString(axiosError.stack) : null,
  };
}

export function sanitizeForLog(value: unknown) {
  return sanitizeUnknown(value);
}
