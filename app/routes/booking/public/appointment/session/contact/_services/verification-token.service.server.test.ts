import { describe, expect, it } from 'vitest';
import { parseVerificationExpiry } from './verification-token.service.server';

describe('parseVerificationExpiry', () => {
  it('reads the backend’s zone-less expiry as UTC, wherever the server is', () => {
    expect(parseVerificationExpiry('2026-11-17T15:03:30')?.toISOString()).toBe('2026-11-17T15:03:30.000Z');
    expect(parseVerificationExpiry('2026-07-01T10:00:00.123456')?.toISOString()).toBe('2026-07-01T10:00:00.123Z');
  });

  it('keeps an explicit zone', () => {
    expect(parseVerificationExpiry('2026-11-17T15:03:30+01:00')?.toISOString()).toBe('2026-11-17T14:03:30.000Z');
    expect(parseVerificationExpiry('2026-11-17T15:03:30Z')?.toISOString()).toBe('2026-11-17T15:03:30.000Z');
  });

  it('gives no expiry for nothing or nonsense', () => {
    expect(parseVerificationExpiry(null)).toBeUndefined();
    expect(parseVerificationExpiry('not a date')).toBeUndefined();
  });
});
