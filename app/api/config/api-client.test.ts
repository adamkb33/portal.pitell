import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { createClientConfig } from './api-client';

const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

function apiThatAnswers(status: number) {
  const axios = createClientConfig({} as never).axios as AxiosInstance;
  axios.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
      status,
      statusText: String(status),
      data: { message: 'Unauthorized' },
      headers: {},
      config,
    });
  };
  return axios;
}

describe('a call the backend refuses', () => {
  it('logs which sign-in was used, without the token', async () => {
    const token = jwt.sign({ sub: '7', companyId: 1, exp: 1_800_000_000 }, 'secret');

    await expect(
      apiThatAnswers(401).get('https://pitell-api.onrender.com/base-service/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ).rejects.toThrow();

    const line = warn.mock.calls.map(([text]) => String(text)).find((text) => text.includes('[auth]'));
    expect(line).toBe(
      '[WARN] [auth] 401 on GET /base-service/auth/me {"signedIn":true,"userId":"7","companyId":1,"expiresAt":"2027-01-15T08:00:00.000Z"}',
    );
    expect(line).not.toContain(token);
  });

  it('says when no one was signed in', async () => {
    warn.mockClear();

    await expect(apiThatAnswers(403).get('https://pitell-api.onrender.com/base-service/auth/me')).rejects.toThrow();

    expect(warn.mock.calls.map(([text]) => String(text))).toContain(
      '[WARN] [auth] 403 on GET /base-service/auth/me {"signedIn":false}',
    );
  });
});
