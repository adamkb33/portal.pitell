import { z } from 'zod';
import { CAMPAIGN_LIMITS, campaignNameSchema, mergeText } from '../../_create/_schemas/content.schema';
export { CAMPAIGN_LIMITS } from '../../_create/_schemas/content.schema';

export const smsCampaignCreateSchema = z.object({
  name: campaignNameSchema,
  body: mergeText(CAMPAIGN_LIMITS.smsBody, 'Skriv en melding.'),
});
export type SmsCampaignCreateInput = z.infer<typeof smsCampaignCreateSchema>;
export function parseSmsCampaignForm(form: FormData) {
  return smsCampaignCreateSchema.safeParse({
    name: form.get('name') ?? undefined,
    body: form.get('body') ?? undefined,
  });
}
