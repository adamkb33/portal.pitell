import axios, { type CreateAxiosDefaults } from 'axios';

import { logger } from '~/lib/logger';
import { describeAxiosError, describeAxiosRequest, describeAxiosResponse } from '~/lib/http-log';

export function createLoggedAxios(serviceName: string, defaults?: CreateAxiosDefaults) {
  const instance = axios.create(defaults);

  instance.interceptors.request.use(
    (config) => {
      logger.info(`[api:${serviceName}] Request`, describeAxiosRequest(config));
      return config;
    },
    (error) => {
      logger.error(`[api:${serviceName}] Request setup failed`, describeAxiosError(error));
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      logger.info(`[api:${serviceName}] Response`, describeAxiosResponse(response));
      return response;
    },
    (error) => {
      logger.error(`[api:${serviceName}] Request failed`, describeAxiosError(error));
      return Promise.reject(error);
    },
  );

  return instance;
}
