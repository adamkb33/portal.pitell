import { describe, expect, it } from 'vitest';
import { normalizeVerificationCode } from './verification-code-input';

describe('normalizeVerificationCode', () => {
  it('keeps a plain code as typed', () => {
    expect(normalizeVerificationCode('123456', 6)).toBe('123456');
  });

  it('preserves leading zeros as a string', () => {
    expect(normalizeVerificationCode('012345', 6)).toBe('012345');
    expect(normalizeVerificationCode('000000', 6)).toBe('000000');
  });

  it('accepts a pasted code containing spaces', () => {
    expect(normalizeVerificationCode('123 456', 6)).toBe('123456');
  });

  it('ignores characters that are not digits', () => {
    expect(normalizeVerificationCode('12a3-4b56', 6)).toBe('123456');
  });

  it('caps the value at the code length', () => {
    expect(normalizeVerificationCode('1234567890', 6)).toBe('123456');
  });

  it('allows a partially entered code while correcting', () => {
    expect(normalizeVerificationCode('12345', 6)).toBe('12345');
    expect(normalizeVerificationCode('', 6)).toBe('');
  });

  it('respects a non-default length', () => {
    expect(normalizeVerificationCode('12345678', 4)).toBe('1234');
  });
});
