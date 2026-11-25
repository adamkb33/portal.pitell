import type { AxiosError, AxiosRequestConfig } from 'axios';

const MAX_STRING_LENGTH = 500;

// Fields that are secrets: anyone holding the value can act as the user. Matched by name, in any letter case.
const SECRET_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'token',
  'authtokens',
  'completiontoken',
  'password',
  'otp',
]);

// Fields that are personal data. Masked rather than removed, so a log line can still be matched to a customer.
const PERSONAL_KEYS = new Set(['email', 'mobilenumber', 'phonenumber', 'emailormobile', 'givenname', 'familyname']);

// URL path segments that are secrets on their own (anyone holding them can act), so logs never show them.
const SECRET_PATH_SEGMENTS = [/(\/public\/unsubscribe\/)[^/?#\s"]+/g];

// Query parameters whose values a log shows: ids that tie a line to a booking session, company or appointment.
const LOGGED_QUERY_KEYS = new Set(['sessionId', 'companyId', 'appointmentId', 'profileId', 'userId']);

export function redactUrl(text: string) {
  return SECRET_PATH_SEGMENTS.reduce((current, pattern) => current.replace(pattern, '$1[Redacted]'), text);
}

function truncateString(value: string) {
  return value.length <= MAX_STRING_LENGTH ? value : `${value.slice(0, MAX_STRING_LENGTH)}...<truncated>`;
}

/** "pedro@gmail.com" → "pe***@gmail.com", "+4740104131" → "+47***31", "Pedro" → "P***". */
function maskPersonal(value: string) {
  const at = value.indexOf('@');
  if (at > 0) return `${value.slice(0, Math.min(2, at))}***${value.slice(at)}`;
  if (/^\+?[\d\s]{6,}$/.test(value)) return `${value.slice(0, 3)}***${value.slice(-2)}`;
  return value ? `${value[0]}***` : value;
}

function sanitizeUnknown(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(redactUrl(value));
  }

  if (value instanceof Error) {
    return describeAxiosError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeUnknown(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);

    const sanitized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const name = key.toLowerCase();
      if (SECRET_KEYS.has(name)) {
        sanitized[key] = '[Redacted]';
      } else if (PERSONAL_KEYS.has(name)) {
        sanitized[key] = typeof entry === 'string' ? maskPersonal(entry) : entry == null ? entry : '[Redacted]';
      } else {
        sanitized[key] = sanitizeUnknown(entry, seen);
      }
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

  if (/^https?:\/\//i.test(config.url) || !config.baseURL) {
    return config.url;
  }

  return `${config.baseURL.replace(/\/$/, '')}/${config.url.replace(/^\//, '')}`;
}

/**
 * "/booking/cancel?appointmentId=5213&token=…": the path with id values shown and every other value hidden, since
 * query strings can hold secrets (cancel and invite tokens).
 */
export function describePath(url: URL, extraParams?: Record<string, unknown>) {
  const params = { ...Object.fromEntries(url.searchParams), ...extraParams };
  const query = Object.entries(params)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${LOGGED_QUERY_KEYS.has(key) ? encodeURIComponent(String(value)) : '…'}`)
    .join('&');
  return `${redactUrl(url.pathname)}${query ? `?${query}` : ''}`;
}

/** "GET /booking-service/public/appointment-session/get-session?sessionId=…": method and described path. */
export function describeCall(config?: AxiosRequestConfig) {
  const method = config?.method?.toUpperCase() ?? 'GET';
  const raw = buildRequestUrl(config);
  if (!raw) return method;

  try {
    return `${method} ${describePath(new URL(raw, 'http://unknown'), config?.params as Record<string, unknown>)}`;
  } catch {
    return `${method} ${redactUrl(raw.split('?')[0])}`;
  }
}

/** The backend's own error text from an ApiResponse body ({ message: { id, value } } or { message: "…" }). */
function backendMessageOf(body: unknown): string | null {
  const message = (body as { message?: unknown } | null | undefined)?.message;
  if (typeof message === 'string') return truncateString(message);
  if (message && typeof message === 'object') {
    const { value, id } = message as { value?: unknown; id?: unknown };
    const text = typeof value === 'string' && value ? value : typeof id === 'string' ? id : null;
    return text ? truncateString(text) : null;
  }
  return null;
}

/**
 * What failed and why, in a few fields: the call, the status and the backend's message for a request error; status
 * and target for a thrown Response; name, message and a short stack for anything else. Never headers or bodies.
 */
export function describeAxiosError(error: unknown) {
  const axiosError = error as AxiosError | undefined;

  if (axiosError?.isAxiosError) {
    return {
      call: describeCall(axiosError.config),
      status: axiosError.response?.status ?? null,
      backendMessage: backendMessageOf(axiosError.response?.data),
      code: axiosError.response ? null : (axiosError.code ?? null),
      message: axiosError.message,
    };
  }

  if (error instanceof Response) {
    return { status: error.status, location: error.headers.get('Location') };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncateString(redactUrl(error.message)),
      stack: error.stack ? truncateString(error.stack) : undefined,
    };
  }

  return { message: truncateString(redactUrl(String(error))) };
}

export function sanitizeForLog(value: unknown) {
  return sanitizeUnknown(value);
}
