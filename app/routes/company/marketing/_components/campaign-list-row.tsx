import { ChevronRight, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';
import type { CampaignSummaryDto } from '~/api/generated';
import { cn } from '~/ui';
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  formatCampaignDay,
  formatCampaignTime,
  getCampaignDetailHref,
  pluralize,
} from '../_utils/campaigns';
import { StatusChip } from './status-chip';

// Row treatment shows status; channel icons use the same accents as the editor.
// Full class names so Tailwind can see them.
const rowStyles: Record<CampaignSummaryDto['status'], string> = {
  SENDING: 'bg-interactive/10 shadow-[inset_4px_0_0_var(--color-interactive)] hover:bg-interactive/15',
  COMPLETED: 'bg-background shadow-[inset_4px_0_0_var(--color-border)] hover:bg-surface-variant-1',
  CANCELLED: 'bg-surface-variant-1 hover:bg-surface-variant-2',
};

/** Start date and time, then name with channel and recipients, then sent of total (with "Sender"/"Avbrutt" above it). */
export function CampaignListRow({ campaign }: { campaign: CampaignSummaryDto }) {
  const cancelled = campaign.status === 'CANCELLED';
  const strongText = cancelled ? 'text-text-secondary' : 'text-text-primary';

  return (
    <Link
      to={getCampaignDetailHref(campaign.id)}
      className={cn(
        'flex h-[3.75rem] w-full items-center gap-3 px-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5',
        rowStyles[campaign.status],
      )}
    >
      <time dateTime={campaign.startedAt} className="block w-18 shrink-0">
        <span className={cn('block whitespace-nowrap text-base font-semibold tabular-nums leading-tight', strongText)}>
          {formatCampaignDay(campaign.startedAt)}
        </span>
        <span className="block text-xs text-text-secondary tabular-nums">{formatCampaignTime(campaign.startedAt)}</span>
      </time>

      <span
        aria-hidden
        className={cn(
          'hidden size-9 shrink-0 items-center justify-center rounded-xl sm:flex',
          campaign.channel === 'EMAIL'
            ? 'bg-marketing-email-soft text-marketing-email'
            : 'bg-marketing-sms-soft text-marketing-sms',
          cancelled && 'opacity-50',
        )}
      >
        {campaign.channel === 'EMAIL' ? <Mail className="size-4" /> : <MessageSquare className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-semibold', strongText)}>{campaign.name}</span>
        <span className="block truncate text-sm text-text-secondary">
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
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {campaign.status === 'SENDING' ? (
          <StatusChip tone="active">{STATUS_LABELS.SENDING}</StatusChip>
        ) : cancelled ? (
          <StatusChip tone="muted">{STATUS_LABELS.CANCELLED}</StatusChip>
        ) : (
          <span className="sr-only">{STATUS_LABELS.COMPLETED}</span>
        )}
        <span className={cn('whitespace-nowrap text-sm font-semibold tabular-nums', strongText)}>
          {campaign.counts.sent} / {campaign.eligibleCount}
          <span className="sr-only"> sendt</span>
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}
