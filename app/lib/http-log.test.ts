import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { describeAxiosError, describeCall, redactUrl, sanitizeForLog } from './http-log';

function failedCall(url: string, status: number, body: unknown) {
  const config = {
    method: 'get',
    baseURL: 'https://pitell-api.onrender.com',
    url,
    headers: { Authorization: 'Bearer secret-access-token' },
  } as unknown as InternalAxiosRequestConfig;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: 'Bad Request',
    data: body,
    headers: { 'set-cookie': ['refresh=secret-refresh-token'] },
    config,
  });
}

describe('http log redaction', () => {
  it('hides unsubscribe tokens in URLs and text', () => {
    expect(redactUrl('http://api/marketing-service/public/unsubscribe/abc_DEF-123?x=1')).toBe(
      'http://api/marketing-service/public/unsubscribe/[Redacted]?x=1',
    );
    expect(redactUrl('No token here')).toBe('No token here');
  });

  it('describes a call by method and path, showing id values and hiding every other value', () => {
    expect(
      describeCall({
        method: 'get',
        baseURL: 'https://pitell-api.onrender.com',
        url: '/booking-service/public/appointment-session/get-appointment-by-cancel-token?token=abc&sessionId=s1',
      }),
    ).toBe('GET /booking-service/public/appointment-session/get-appointment-by-cancel-token?token=…&sessionId=s1');

    expect(describeCall({ method: 'post', url: 'http://api/marketing-service/public/unsubscribe/secret123' })).toBe(
      'POST /marketing-service/public/unsubscribe/[Redacted]',
    );
  });

  it('removes tokens and masks personal data wherever they appear', () => {
    const logged = JSON.stringify(
      sanitizeForLog({
        data: {
          authTokens: { accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.sig', refreshToken: 'MmCxFc9_refresh' },
          completionToken: 'completion-secret',
          user: { email: 'pedromanuel.sousa@gmail.com', mobileNumber: '+4740104131', givenName: 'Pedro' },
        },
      }),
    );

    expect(logged).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(logged).not.toContain('MmCxFc9_refresh');
    expect(logged).not.toContain('completion-secret');
    expect(logged).not.toContain('pedromanuel');
    expect(logged).not.toContain('40104131');
    expect(logged).toContain('pe***@gmail.com');
    expect(logged).toContain('+47***31');
    expect(logged).toContain('P***');
  });

  it('says where a backend call failed and why, without headers or the body', () => {
    const error = failedCall('/booking-service/public/appointment-session/get-overview?sessionId=s1', 400, {
      message: { id: 'INVALID_PARAMETER', value: 'selectedServiceIds are required' },
      data: { user: { email: 'pedromanuel.sousa@gmail.com' } },
    });

    expect(describeAxiosError(error)).toEqual({
      call: 'GET /booking-service/public/appointment-session/get-overview?sessionId=s1',
      status: 400,
      backendMessage: 'selectedServiceIds are required',
      code: null,
      message: 'Request failed',
    });
    expect(JSON.stringify(sanitizeForLog({ error }))).not.toMatch(/secret|pedromanuel/);
  });

  it('never logs the token of an unsubscribe request or its error body', () => {
    const logged = JSON.stringify(
      describeAxiosError(
        failedCall('/marketing-service/public/unsubscribe/secret123', 404, {
          path: '/marketing-service/public/unsubscribe/secret123',
        }),
      ),
    );
    expect(logged).not.toContain('secret123');
  });
});
