import { describe, expect, it } from 'vitest';
import { channelSlug, latestYes, parseChannelSlug, recipientInitials, recipientName } from './recipients';

describe('recipient helpers', () => {
  it('turns the channel into the URL value and back; anything else is everyone', () => {
    expect(channelSlug('EMAIL')).toBe('e-post');
    expect(channelSlug('SMS')).toBe('sms');
    expect(parseChannelSlug('e-post')).toBe('EMAIL');
    expect(parseChannelSlug('sms')).toBe('SMS');
    expect(parseChannelSlug('EMAIL')).toBeNull();
    expect(parseChannelSlug(null)).toBeNull();
  });

  it('names the customer, or "Ukjent kunde" without a name', () => {
    expect(recipientName({ givenName: 'Kari', familyName: 'Nordmann' })).toBe('Kari Nordmann');
    expect(recipientName({ givenName: 'Kari' })).toBe('Kari');
    expect(recipientName({})).toBe('Ukjent kunde');
    expect(recipientInitials({ givenName: 'kari', familyName: 'Nordmann' })).toBe('KN');
    expect(recipientInitials({})).toBe('?');
  });

  it('dates the row by the latest yes on any channel', () => {
    expect(
      latestYes({
        channels: [
          { channel: 'EMAIL', address: 'kari@example.no', since: '2026-10-01T10:00:00+02:00' },
          { channel: 'SMS', address: '+4791234567', since: '2026-11-14T09:00:00+01:00' },
        ],
      }),
    ).toBe('2026-11-14T09:00:00+01:00');
    expect(latestYes({ channels: [] })).toBeNull();
  });
});
