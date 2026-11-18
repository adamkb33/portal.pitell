import { CompanyUserMarketingCampaignController, CompanyUserMarketingRecipientController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { osloDateKey } from '~/lib/oslo-time';
import type { CampaignChannel } from './campaigns';

/**
 * Customers who said yes: everyone (each counted once) or one channel. The Mottakere list's own total, so a number
 * on the overview always matches the list it opens. Null when it can't be loaded.
 */
export async function countRecipients(request: Request, channel: CampaignChannel | null): Promise<number | null> {
  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingRecipientController.recipients({
        query: { page: 0, size: 1, ...(channel ? { channel } : {}) },
      }),
    );
    return response.data?.meta?.pagination?.totalElements ?? null;
  } catch {
    return null;
  }
}

const CAMPAIGN_PAGE_SIZE = 50;
const MAX_CAMPAIGN_PAGES = 5;

/**
 * Campaigns started this month (in Oslo). The list comes newest first, so it reads pages until it reaches an
 * older campaign. Null when it can't be loaded.
 */
export async function countCampaignsThisMonth(request: Request, now = new Date()): Promise<number | null> {
  const month = osloDateKey(now).slice(0, 7);
  let count = 0;

  try {
    for (let page = 0; page < MAX_CAMPAIGN_PAGES; page++) {
      const response = await withAuth(request, () =>
        CompanyUserMarketingCampaignController.list({ query: { page, size: CAMPAIGN_PAGE_SIZE } }),
      );
      const campaigns = response.data?.data ?? [];
      for (const campaign of campaigns) {
        if (osloDateKey(campaign.startedAt).slice(0, 7) !== month) return count;
        count++;
      }
      const totalPages = response.data?.meta?.pagination?.totalPages ?? 1;
      if (page + 1 >= totalPages) return count;
    }
    return count;
  } catch {
    return null;
  }
}
