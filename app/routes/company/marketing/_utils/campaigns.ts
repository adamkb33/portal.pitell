import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { CampaignSummaryDto, MarketingMessageDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

export type CampaignChannel = CampaignSummaryDto['channel'];
export type CampaignStatus = CampaignSummaryDto['status'];

export const CHANNEL_LABELS: Record<CampaignChannel, string> = { EMAIL: 'E-post', SMS: 'SMS' };

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  SENDING: 'Sender',
  COMPLETED: 'Fullført',
  CANCELLED: 'Avbrutt',
};

export type MessageStatus = MarketingMessageDto['status'];

export const MESSAGE_STATUSES: MessageStatus[] = ['SENT', 'QUEUED', 'FAILED', 'SKIPPED'];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  SENT: 'Sendt',
  QUEUED: 'I kø',
  FAILED: 'Feilet',
  SKIPPED: 'Hoppet over',
};

export const SKIP_REASON_LABELS: Record<NonNullable<MarketingMessageDto['skipReason']>, string> = {
  NO_CONSENT: 'Mangler samtykke',
  CAMPAIGN_CANCELLED: 'Kampanjen ble avbrutt',
};

export function parseMessageStatus(value: string | null): MessageStatus | null {
  return MESSAGE_STATUSES.find((status) => status === value) ?? null;
}

/** A page number from the URL; anything missing or invalid is the first page. */
export function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '0', 10);
  return Number.isInteger(page) && page > 0 ? page : 0;
}

/** Norwegian mobiles as "+47 455 00 018"; anything else (email, foreign numbers) as stored. */
export function formatRecipientAddress(address: string): string {
  const mobile = /^\+47(\d{3})(\d{2})(\d{3})$/.exec(address);
  return mobile ? `+47 ${mobile[1]} ${mobile[2]} ${mobile[3]}` : address;
}

export function getCampaignDetailHref(campaignId: number): string {
  return ROUTES_MAP['company.marketing.detail'].href.replace(':campaignId', String(campaignId));
}

/** "5. nov" (date-fns writes "5. nov." in Norwegian; the row has no room for the dot). */
export const formatCampaignDay = (iso: string) => format(parseISO(iso), 'd. MMM', { locale: nb }).replace(/\.$/, '');

export const formatCampaignTime = (iso: string) => format(parseISO(iso), 'HH:mm');

export const pluralize = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export type CampaignMonthGroup<T> = { key: string; label: string; items: T[] };

/** Groups campaigns by the month they started, keeping the backend's newest-first order. */
export function groupCampaignsByMonth<T extends Pick<CampaignSummaryDto, 'startedAt'>>(
  campaigns: T[],
): CampaignMonthGroup<T>[] {
  const groups = new Map<string, CampaignMonthGroup<T>>();
  for (const campaign of campaigns) {
    const date = parseISO(campaign.startedAt);
    const key = format(date, 'yyyy-MM');
    if (!groups.has(key)) {
      const label = format(date, 'LLLL yyyy', { locale: nb });
      groups.set(key, { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] });
    }
    groups.get(key)!.items.push(campaign);
  }
  return Array.from(groups.values());
}
