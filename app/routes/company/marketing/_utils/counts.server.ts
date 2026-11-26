import { CompanyUserMarketingRecipientController } from '~/api/generated';
import type { CampaignChannel } from './campaigns';

/**
 * Customers who said yes: everyone (each counted once) or one channel. The Mottakere list's own total, so the number
 * on an overview card always matches the list it leads to. Null when it can't be loaded.
 */
export async function countRecipients(request: Request, channel: CampaignChannel | null): Promise<number | null> {
  try {
    const response = await CompanyUserMarketingRecipientController.recipients({
      query: { page: 0, size: 1, ...(channel ? { channel } : {}) },
    });
    return response.data?.meta?.pagination?.totalElements ?? null;
  } catch {
    return null;
  }
}
