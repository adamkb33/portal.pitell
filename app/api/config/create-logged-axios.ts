import axios, { type AxiosError, type AxiosRequestConfig, type CreateAxiosDefaults } from 'axios';

import { logger } from '~/lib/logger';
import { isBackendDown } from '~/lib/api-error';
import { reportBackendDown } from '~/lib/backend-status';
import { describeAxiosError, describeCall, sanitizeForLog } from '~/lib/http-log';

const STARTED_AT = Symbol('startedAt');

type TimedConfig = AxiosRequestConfig & { [STARTED_AT]?: number };

function elapsed(config?: AxiosRequestConfig) {
  const startedAt = (config as TimedConfig | undefined)?.[STARTED_AT];
  return startedAt ? `${Date.now() - startedAt}ms` : '';
}

// Set LOG_API_BODIES=1 (e.g. on Vercel, then redeploy) to also log what the backend returned while debugging.
// Secrets and personal fields are still redacted by the logger. Off by default: bodies are large.
function bodyForLog(body: unknown) {
  return typeof process !== 'undefined' && process.env.LOG_API_BODIES === '1' ? { body: sanitizeForLog(body) } : {};
}

/**
 * An axios instance that logs one line per backend call: method, path (ids only from the query), status and time.
 * 4xx is a warning (the backend said no), 5xx and no answer are errors (the call failed). Never headers or bodies.
 */
export function createLoggedAxios(serviceName: string, defaults?: CreateAxiosDefaults) {
  const instance = axios.create(defaults);

  instance.interceptors.request.use(
    (config) => {
      (config as TimedConfig)[STARTED_AT] = Date.now();
      return config;
    },
    (error) => {
      logger.error(`[${serviceName}] request could not be sent`, { error: describeAxiosError(error) });
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      const line = `[${serviceName}] ${describeCall(response.config)} ${response.status} ${elapsed(response.config)}`;
      logger.info(line, bodyForLog(response.data));
      return response;
    },
    (error: AxiosError) => {
      const { status, backendMessage, code, message } = describeAxiosError(error) as {
        status: number | null;
        backendMessage: string | null;
        code: string | null;
        message: string;
      };
      const line = `[${serviceName}] ${describeCall(error.config)} ${status ?? 'no response'} ${elapsed(error.config)}`;
      const context = {
        backendMessage,
        code,
        message: status ? undefined : message,
        ...bodyForLog(error.response?.data),
      };

      if (status && status < 500) logger.warn(line, context);
      else logger.error(line, context);

      if (isBackendDown(error)) reportBackendDown();
      return Promise.reject(error);
    },
  );

  return instance;
}
