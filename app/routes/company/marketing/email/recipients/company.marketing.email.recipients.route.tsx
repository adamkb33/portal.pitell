import type { Route } from './+types/company.marketing.email.recipients.route';
import { ChannelRecipientsPage } from '../../_components/channel-recipients-page';
import { loadChannelRecipients } from '../../_utils/channel-lists.server';

export const loader = ({ request }: Route.LoaderArgs) => loadChannelRecipients(request, 'EMAIL');

export default function CompanyMarketingEmailRecipientsRoute({ loaderData }: Route.ComponentProps) {
  return <ChannelRecipientsPage channel="EMAIL" {...loaderData} />;
}
