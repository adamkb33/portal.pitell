import type { CampaignSummaryDto } from '~/api/generated';
import { ListRow, cn } from '~/ui';
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  formatCampaignDay,
  formatCampaignTime,
  getCampaignDetailHref,
  pluralize,
} from '../_utils/campaigns';
import { StatusChip } from './status-chip';

/**
 * A campaign in the list standard: start date and time, name with channel and recipients, then sent of total. Sending
 * is highlighted like the next appointment ("Sender" above the number); a cancelled one is greyed ("Avbrutt").
 */
export function CampaignListRow({ campaign }: { campaign: CampaignSummaryDto }) {
  const sending = campaign.status === 'SENDING';
  const cancelled = campaign.status === 'CANCELLED';

  return (
    <ListRow
      to={getCampaignDetailHref(campaign.id)}
      state={sending ? 'next' : cancelled ? 'done' : undefined}
      lead={
        <time dateTime={campaign.startedAt} className="block w-13 leading-tight">
          <span
            className={cn(
              'block whitespace-nowrap text-sm font-semibold tabular-nums',
              cancelled ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {formatCampaignDay(campaign.startedAt)}
          </span>
          <span className="block text-xs text-text-secondary tabular-nums">
            {formatCampaignTime(campaign.startedAt)}
          </span>
        </time>
      }
      title={campaign.name}
      line={
        <>
          <span
            className={cn(
              cancelled
                ? 'text-text-secondary'
                : campaign.channel === 'EMAIL'
                  ? 'text-marketing-email'
                  : 'text-marketing-sms',
            )}
          >
            {CHANNEL_LABELS[campaign.channel]}
          </span>{' '}
          · {pluralize(campaign.eligibleCount, 'mottaker', 'mottakere')}
        </>
      }
      trailing={
        <span className={cn('flex flex-col items-end gap-0.5', cancelled && 'text-text-secondary')}>
          {sending ? (
            <StatusChip tone="active">{STATUS_LABELS.SENDING}</StatusChip>
          ) : cancelled ? (
            <StatusChip tone="muted">{STATUS_LABELS.CANCELLED}</StatusChip>
          ) : (
            <span className="sr-only">{STATUS_LABELS.COMPLETED}</span>
          )}
          <span>
            {campaign.counts.sent} / {campaign.eligibleCount}
            <span className="sr-only"> sendt</span>
          </span>
        </span>
      }
    />
  );
}
