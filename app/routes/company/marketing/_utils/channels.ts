import { ROUTES_MAP } from '~/lib/routing/route-tree';
import type { CampaignChannel } from './campaigns';

type ChannelPage = 'campaigns' | 'recipients' | 'create';

/**
 * E-post and SMS each have their own pages (approved 2026-11-19): Kampanjer | Mottakere for that channel and a
 * create page for that channel only.
 */
const CHANNEL_ROUTE_IDS: Record<CampaignChannel, Record<ChannelPage, string>> = {
  EMAIL: {
    campaigns: 'company.marketing.email',
    recipients: 'company.marketing.email.recipients',
    create: 'company.marketing.email.create',
  },
  SMS: {
    campaigns: 'company.marketing.sms',
    recipients: 'company.marketing.sms.recipients',
    create: 'company.marketing.sms.create',
  },
};

export const CREATE_LABELS: Record<CampaignChannel, string> = { EMAIL: 'Ny e-post', SMS: 'Ny SMS' };

export function channelRouteId(channel: CampaignChannel, page: ChannelPage): string {
  return CHANNEL_ROUTE_IDS[channel][page];
}

export function channelHref(channel: CampaignChannel, page: ChannelPage): string {
  return ROUTES_MAP[channelRouteId(channel, page)].href;
}
