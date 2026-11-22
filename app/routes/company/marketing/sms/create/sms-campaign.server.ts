import { data, redirect } from 'react-router';
import { CompanyUserMarketingCampaignController, CompanyUserSmsCampaignController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { loader as requireMarketingAdmin } from '../../company.marketing.layout';
import { getCampaignDetailHref } from '../../_utils/campaigns';
import { channelHref } from '../../_utils/channels';
import { parseSmsCampaignForm } from './sms-campaign.schema';

export async function loadSmsCampaignCreate(request: Request) {
  await requireMarketingAdmin({ request });
  const unsubscribeBaseUrl = (process.env.pitell_PORTAL_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingCampaignController.audienceCount({ query: { channel: 'SMS' } }),
    );
    return {
      recipients: (response.data?.data?.eligibleCount ?? 0) as number | null,
      unsubscribeBaseUrl,
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente antall mottakere');
    return { recipients: null, unsubscribeBaseUrl, error: message };
  }
}
export type SmsCampaignCreateLoaderData = Awaited<ReturnType<typeof loadSmsCampaignCreate>>;
export type SmsCampaignCreateActionResult = { error: string };
export async function createSmsCampaign(request: Request) {
  await requireMarketingAdmin({ request });
  const form = await request.formData();
  const parsed = parseSmsCampaignForm(form);
  if (form.get('intent') !== 'send' || !parsed.success)
    return data({ error: 'Sjekk feltene og prøv igjen.' }, { status: 400 });
  try {
    const response = await withAuth(request, () =>
      CompanyUserSmsCampaignController.createSmsCampaign({ body: parsed.data }),
    );
    const campaignId = response.data?.data?.id;
    return redirect(campaignId ? getCampaignDetailHref(campaignId) : channelHref('SMS', 'campaigns'));
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke sende kampanjen.');
    return data({ error: message }, { status: 400 });
  }
}
