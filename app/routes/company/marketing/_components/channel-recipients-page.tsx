import { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { MarketingRecipientDto } from '~/api/generated';
import {
  CompanyPageTemplate,
  ListBody,
  ListCard,
  ListEmpty,
  ListFooter,
  ListRow,
  ListRows,
  ListStrip,
  PageNotice,
  categoryTone,
  cn,
} from '~/ui';
import { formatRecipientAddress, groupByMonth, pluralize, type CampaignChannel } from '../_utils/campaigns';
import type { ChannelRecipientsData } from '../_utils/channel-lists.server';
import { recipientInitials, recipientName, recipientSince } from '../_utils/recipients';
import { ChannelToolbar } from './channel-toolbar';

/**
 * E-post or SMS → Mottakere (Liste on the list standard, approved 2026-11-19): the customers who said yes to that
 * channel, grouped by the month they said yes, newest first. Each row: the customer and where they get it (the
 * e-mail address or mobile number). Nothing to open or create.
 */
export function ChannelRecipientsPage({
  channel,
  recipients,
  pagination,
  error,
}: ChannelRecipientsData & { channel: CampaignChannel }) {
  const groups = useMemo(
    () => groupByMonth(recipients, (recipient) => recipientSince(recipient, channel) ?? new Date(0).toISOString()),
    [recipients, channel],
  );

  return (
    <CompanyPageTemplate title={channel === 'EMAIL' ? 'E-post-mottakere' : 'SMS-mottakere'}>
      <ChannelToolbar channel={channel} />

      {error ? (
        <PageNotice title="Kunne ikke hente mottakere" />
      ) : (
        <ListCard label="Mottakere">
          <ListBody>
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <ListStrip label={group.label} count={pluralize(group.items.length, 'kunde', 'kunder')} />
                <ListRows>
                  {group.items.map((recipient) => (
                    <li key={recipient.userId}>
                      <RecipientRow recipient={recipient} channel={channel} />
                    </li>
                  ))}
                </ListRows>
              </section>
            ))}
            {recipients.length === 0 ? (
              <ListEmpty
                icon={Users}
                title={channel === 'EMAIL' ? 'Ingen har sagt ja til e-post ennå' : 'Ingen har sagt ja til SMS ennå'}
              />
            ) : null}
          </ListBody>

          {pagination.totalElements > 0 ? (
            <ListFooter
              total={pluralize(pagination.totalElements, 'kunde', 'kunder')}
              page={pagination.page}
              totalPages={pagination.totalPages}
            />
          ) : null}
        </ListCard>
      )}
    </CompanyPageTemplate>
  );
}

/** Initials in the customer's colour, the name, and the address this channel reaches them on. */
function RecipientRow({ recipient, channel }: { recipient: MarketingRecipientDto; channel: CampaignChannel }) {
  const tone = categoryTone(recipient.userId);
  const address = recipient.channels.find((item) => item.channel === channel)?.address;

  return (
    <ListRow
      lead={
        <span
          aria-hidden
          className={cn('grid size-8 place-items-center rounded-full text-xs font-bold', tone.tint, tone.ink)}
        >
          {recipientInitials(recipient)}
        </span>
      }
      title={recipientName(recipient)}
      line={address ? formatRecipientAddress(address) : undefined}
    />
  );
}
