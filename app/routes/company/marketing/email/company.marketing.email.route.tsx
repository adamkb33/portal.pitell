import type { Route } from './+types/company.marketing.email.route';
import type { CreateActionHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { ChannelCampaignsPage } from '../_components/channel-campaigns-page';
import { CREATE_LABELS, channelRouteId } from '../_utils/channels';
import { loadChannelCampaigns } from '../_utils/channel-lists.server';

export const handle = {
  createAction: { label: CREATE_LABELS.EMAIL, to: ROUTES_MAP[channelRouteId('EMAIL', 'create')].href },
} satisfies CreateActionHandle;

export const loader = ({ request }: Route.LoaderArgs) => loadChannelCampaigns(request, 'EMAIL');

export default function CompanyMarketingEmailRoute({ loaderData }: Route.ComponentProps) {
  return <ChannelCampaignsPage channel="EMAIL" {...loaderData} />;
}
