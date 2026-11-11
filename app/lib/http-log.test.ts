import { describe, expect, it } from 'vitest';
import { describeAxiosError, describeAxiosRequest, redactUrl } from './http-log';

describe('http log redaction', () => {
  it('hides unsubscribe tokens in URLs and text', () => {
    expect(redactUrl('http://api/marketing-service/public/unsubscribe/abc_DEF-123?x=1')).toBe(
      'http://api/marketing-service/public/unsubscribe/[Redacted]?x=1',
    );
    expect(redactUrl('No token here')).toBe('No token here');
  });

  it('never logs the token of an unsubscribe request or its error body', () => {
    const config = { method: 'post', baseURL: 'http://api', url: '/marketing-service/public/unsubscribe/secret123' };
    expect(describeAxiosRequest(config).url).toBe('http://api/marketing-service/public/unsubscribe/[Redacted]');

    const logged = JSON.stringify(
      describeAxiosError({
        message: 'Request failed',
        config,
        response: { status: 404, data: { path: '/marketing-service/public/unsubscribe/secret123' } },
      }),
    );
    expect(logged).not.toContain('secret123');
  });
});
