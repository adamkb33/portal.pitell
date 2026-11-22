import type { Route } from './+types/company.marketing.sms.create.route';
import { SmsCampaignCreatePage } from './sms-campaign-create-page';
import { createSmsCampaign, loadSmsCampaignCreate } from './sms-campaign.server';

export const loader = ({ request }: Route.LoaderArgs) => loadSmsCampaignCreate(request);

export const action = ({ request }: Route.ActionArgs) => createSmsCampaign(request);

export default function CompanyMarketingSmsCreateRoute({ loaderData, actionData }: Route.ComponentProps) {
  return <SmsCampaignCreatePage loaderData={loaderData} actionData={actionData} />;
}
