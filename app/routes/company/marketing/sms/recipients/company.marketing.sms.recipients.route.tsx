import type { Route } from './+types/company.marketing.sms.recipients.route';
import { ChannelRecipientsPage } from '../../_components/channel-recipients-page';
import { loadChannelRecipients } from '../../_utils/channel-lists.server';

export const loader = ({ request }: Route.LoaderArgs) => loadChannelRecipients(request, 'SMS');

export default function CompanyMarketingSmsRecipientsRoute({ loaderData }: Route.ComponentProps) {
  return <ChannelRecipientsPage channel="SMS" {...loaderData} />;
}
