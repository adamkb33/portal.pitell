import { useMemo } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { CompanyPageTemplate, ListBody, ListCard, ListEmpty, ListFooter, ListRows, ListStrip, PageNotice } from '~/ui';
import { CHANNEL_LABELS, groupCampaignsByMonth, pluralize, type CampaignChannel } from '../_utils/campaigns';
import type { ChannelCampaignsData } from '../_utils/channel-lists.server';
import { CampaignListRow } from './campaign-list-row';
import { ChannelToolbar } from './channel-toolbar';

/**
 * E-post or SMS → Kampanjer (Liste on the list standard, approved 2026-11-19): that channel's campaigns by the month
 * they started, newest first. The page's create action is Ny e-post / Ny SMS (declared in the route).
 */
export function ChannelCampaignsPage({
  channel,
  campaigns,
  pagination,
  error,
}: ChannelCampaignsData & { channel: CampaignChannel }) {
  const groups = useMemo(() => groupCampaignsByMonth(campaigns), [campaigns]);
  const label = CHANNEL_LABELS[channel];

  return (
    <CompanyPageTemplate title={label}>
      <ChannelToolbar channel={channel} />

      {error ? (
        <PageNotice title="Kunne ikke hente kampanjer" />
      ) : (
        <ListCard label="Kampanjer">
          <ListBody>
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <ListStrip label={group.label} count={pluralize(group.items.length, 'kampanje', 'kampanjer')} />
                <ListRows>
                  {group.items.map((campaign) => (
                    <li key={campaign.id}>
                      <CampaignListRow campaign={campaign} />
                    </li>
                  ))}
                </ListRows>
              </section>
            ))}
            {pagination.totalElements === 0 ? (
              <ListEmpty
                icon={channel === 'EMAIL' ? Mail : MessageSquare}
                title={channel === 'EMAIL' ? 'Ingen e-postkampanjer ennå' : 'Ingen SMS-kampanjer ennå'}
              />
            ) : null}
          </ListBody>

          {pagination.totalElements > 0 ? (
            <ListFooter
              total={pluralize(pagination.totalElements, 'kampanje', 'kampanjer')}
              page={pagination.page}
              totalPages={pagination.totalPages}
            />
          ) : null}
        </ListCard>
      )}
    </CompanyPageTemplate>
  );
}
