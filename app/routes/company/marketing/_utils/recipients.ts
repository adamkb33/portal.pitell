import type { MarketingRecipientDto } from '~/api/generated';
import type { CampaignChannel } from './campaigns';

/** `?kanal=` on Mottakere: no value is everyone, `e-post` and `sms` one channel each. */
export const CHANNEL_PARAM = 'kanal';

const CHANNEL_SLUGS: Record<CampaignChannel, string> = { EMAIL: 'e-post', SMS: 'sms' };

export function channelSlug(channel: CampaignChannel): string {
  return CHANNEL_SLUGS[channel];
}

export function parseChannelSlug(value: string | null): CampaignChannel | null {
  return (Object.keys(CHANNEL_SLUGS) as CampaignChannel[]).find((channel) => CHANNEL_SLUGS[channel] === value) ?? null;
}

/** "Kari Nordmann"; a customer without a name on file is "Ukjent kunde". */
export function recipientName(recipient: Pick<MarketingRecipientDto, 'givenName' | 'familyName'>): string {
  return [recipient.givenName, recipient.familyName].filter(Boolean).join(' ').trim() || 'Ukjent kunde';
}

/** "KN" from "Kari Nordmann", "?" without a name. */
export function recipientInitials(recipient: Pick<MarketingRecipientDto, 'givenName' | 'familyName'>): string {
  const letters = [recipient.givenName, recipient.familyName].map((part) => part?.trim().charAt(0) ?? '').join('');
  return letters.toUpperCase() || '?';
}

/** When they last said yes, on any channel. */
export function latestYes(recipient: Pick<MarketingRecipientDto, 'channels'>): string | null {
  return recipient.channels.reduce<string | null>(
    (latest, channel) => (!latest || Date.parse(channel.since) > Date.parse(latest) ? channel.since : latest),
    null,
  );
}

/**
 * The date a recipient is listed under: when they said yes to the channel shown, or their latest yes when all
 * channels are shown. It follows the backend's order, so the month groups come out newest first.
 */
export function recipientSince(
  recipient: Pick<MarketingRecipientDto, 'channels'>,
  channel: CampaignChannel | null,
): string | null {
  if (channel) return recipient.channels.find((item) => item.channel === channel)?.since ?? latestYes(recipient);
  return latestYes(recipient);
}
