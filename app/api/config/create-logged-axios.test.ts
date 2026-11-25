import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLoggedAxios } from './create-logged-axios';

const RESUME_RESPONSE = {
  success: true,
  data: {
    sessionId: 's1',
    authTokens: { accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.sig', refreshToken: 'MmCxFc9_refresh' },
  },
};

function respondWith(status: number, data: unknown) {
  return async (config: InternalAxiosRequestConfig) => {
    const response = { status, statusText: String(status), data, headers: {}, config };
    if (status < 400) return response;
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
  };
}

describe('backend call logging', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LOG_API_BODIES;
  });

  afterEach(() => {
    delete process.env.LOG_API_BODIES;
  });

  it('writes one line per call with path, ids, status and time, and no body', async () => {
    const api = createLoggedAxios('api', { adapter: respondWith(200, RESUME_RESPONSE) });

    await api.post('https://pitell-api.onrender.com/booking-service/public/appointment-session/s1/resume?x=1');

    expect(info).toHaveBeenCalledOnce();
    const line = String(info.mock.calls[0][0]);
    expect(line).toMatch(
      /^\[INFO\] \[api\] POST \/booking-service\/public\/appointment-session\/s1\/resume\?x=… 200 \d+ms$/,
    );
    expect(line).not.toContain('eyJ');
  });

  it('logs the backend message as a warning when the backend says no', async () => {
    const api = createLoggedAxios('api', {
      adapter: respondWith(400, { message: { id: 'INVALID', value: 'selectedServiceIds are required' } }),
    });

    await expect(
      api.get('https://pitell-api.onrender.com/booking-service/public/appointment-session/get-overview', {
        params: { sessionId: 's1' },
      }),
    ).rejects.toThrow();

    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toMatch(
      /^\[WARN\] \[api\] GET \/booking-service\/public\/appointment-session\/get-overview\?sessionId=s1 400 \d+ms \{"backendMessage":"selectedServiceIds are required"\}$/,
    );
  });

  it('logs the body with tokens removed only when LOG_API_BODIES is on', async () => {
    process.env.LOG_API_BODIES = '1';
    const api = createLoggedAxios('api', { adapter: respondWith(200, RESUME_RESPONSE) });

    await api.post('https://pitell-api.onrender.com/booking-service/public/appointment-session/s1/resume');

    const line = String(info.mock.calls[0][0]);
    expect(line).toContain('"sessionId":"s1"');
    expect(line).toContain('"authTokens":"[Redacted]"');
    expect(line).not.toContain('eyJ');
  });
});
