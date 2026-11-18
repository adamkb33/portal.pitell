import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useLocation } from 'react-router';
import type { Route } from './+types/company.marketing.recipients.route';
import { CompanyUserMarketingRecipientController, type MarketingRecipientDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { LIST_PAGE_SIZE } from '~/lib/list-page-size';
import {
  CompanyPageTemplate,
  ListBody,
  ListCard,
  ListEmpty,
  ListFooter,
  ListRow,
  ListRows,
  ListStrip,
  ListToolbar,
  PageNotice,
  SegmentedLinks,
  categoryTone,
  cn,
} from '~/ui';
import { loader as requireMarketingAdmin } from '../company.marketing.layout';
import { CHANNEL_LABELS, groupByMonth, parsePage, pluralize, type CampaignChannel } from '../_utils/campaigns';
import { countRecipients } from '../_utils/counts.server';
import {
  CHANNEL_PARAM,
  channelSlug,
  parseChannelSlug,
  recipientInitials,
  recipientName,
  recipientSince,
} from '../_utils/recipients';

const CHANNELS: CampaignChannel[] = ['EMAIL', 'SMS'];

export async function loader({ request }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });

  const url = new URL(request.url);
  const channel = parseChannelSlug(url.searchParams.get(CHANNEL_PARAM));
  const page = parsePage(url.searchParams.get('page'));

  const [list, all, email, sms] = await Promise.all([
    withAuth(request, () =>
      CompanyUserMarketingRecipientController.recipients({
        query: { page, size: LIST_PAGE_SIZE, ...(channel ? { channel } : {}) },
      }),
    ).then(
      (response) => ({ response, error: null as string | null }),
      (error: unknown) => ({ response: null, error: resolveErrorPayload(error, 'Kunne ikke hente mottakere').message }),
    ),
    countRecipients(request, null),
    countRecipients(request, 'EMAIL'),
    countRecipients(request, 'SMS'),
  ]);

  const pagination = list.response?.data?.meta?.pagination;
  return {
    channel,
    recipients: list.response?.data?.data ?? ([] as MarketingRecipientDto[]),
    pagination: {
      page: pagination?.page ?? page,
      totalElements: pagination?.totalElements ?? 0,
      totalPages: Math.max(1, pagination?.totalPages ?? 1),
    },
    counts: { all, EMAIL: email, SMS: sms },
    error: list.error,
  };
}

/**
 * Mottakere (Liste, approved domain sketch 2026-11-18, on the list standard): the customers who said yes to
 * marketing, each once, grouped by the month they said yes (newest first). Alle | E-post | SMS in the URL
 * (`?kanal=`), since every customer says yes to each channel separately. Each row: the customer and the channels
 * they said yes to. Nothing to open or create.
 */
export default function CompanyMarketingRecipientsRoute({ loaderData }: Route.ComponentProps) {
  const { channel, recipients, pagination, counts, error } = loaderData;
  const groups = useMemo(
    () => groupByMonth(recipients, (recipient) => recipientSince(recipient, channel) ?? new Date(0).toISOString()),
    [recipients, channel],
  );

  return (
    <CompanyPageTemplate title="Mottakere">
      {error ? (
        <PageNotice title="Kunne ikke hente mottakere" />
      ) : (
        <ListCard label="Mottakere">
          <ListToolbar>
            <ChannelSwitch channel={channel} counts={counts} />
          </ListToolbar>

          <ListBody>
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <ListStrip label={group.label} count={pluralize(group.items.length, 'kunde', 'kunder')} />
                <ListRows>
                  {group.items.map((recipient) => (
                    <li key={recipient.userId}>
                      <RecipientRow recipient={recipient} />
                    </li>
                  ))}
                </ListRows>
              </section>
            ))}
            {recipients.length === 0 ? (
              <ListEmpty
                icon={Users}
                title={channel ? `Ingen har sagt ja til ${CHANNEL_LABELS[channel]} ennå` : 'Ingen har sagt ja ennå'}
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

function ChannelSwitch({
  channel,
  counts,
}: {
  channel: CampaignChannel | null;
  counts: Record<'all' | CampaignChannel, number | null>;
}) {
  const { pathname } = useLocation();
  const withCount = (label: string, count: number | null) => (count === null ? label : `${label} ${count}`);

  return (
    <SegmentedLinks
      label="Vis mottakere"
      className="w-full sm:w-auto"
      items={[
        { key: 'alle', label: withCount('Alle', counts.all), to: pathname, active: channel === null },
        ...CHANNELS.map((option) => ({
          key: option,
          label: withCount(CHANNEL_LABELS[option], counts[option]),
          to: `${pathname}?${CHANNEL_PARAM}=${channelSlug(option)}`,
          active: channel === option,
        })),
      ]}
    />
  );
}

/** Initials in the customer's colour, the name, and the channels they said yes to. */
function RecipientRow({ recipient }: { recipient: MarketingRecipientDto }) {
  const tone = categoryTone(recipient.userId);

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
      line={recipient.channels.map((item, index) => (
        <span key={item.channel}>
          {index > 0 ? ' · ' : null}
          <span className={item.channel === 'EMAIL' ? 'text-marketing-email' : 'text-marketing-sms'}>
            {CHANNEL_LABELS[item.channel]}
          </span>
        </span>
      ))}
    />
  );
}
