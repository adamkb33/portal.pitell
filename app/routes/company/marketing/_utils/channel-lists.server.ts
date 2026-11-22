import {
  CompanyUserMarketingCampaignController,
  CompanyUserMarketingRecipientController,
  type CampaignSummaryDto,
  type MarketingRecipientDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { LIST_PAGE_SIZE } from '~/lib/list-page-size';
import { loader as requireMarketingAdmin } from '../company.marketing.layout';
import { parsePage, type CampaignChannel } from './campaigns';

type Pagination = { page: number; totalElements: number; totalPages: number };

const EMPTY_PAGINATION: Pagination = { page: 0, totalElements: 0, totalPages: 1 };

/** Paged endpoints return the rows in `data` and the page facts in `meta.pagination`. */
function readPagination(
  pagination: { page?: number; totalElements?: number; totalPages?: number } | undefined,
  page: number,
): Pagination {
  return {
    page: pagination?.page ?? page,
    totalElements: pagination?.totalElements ?? 0,
    totalPages: Math.max(1, pagination?.totalPages ?? 1),
  };
}

/** One channel's campaigns, newest first, 25 per page (`?page=`). */
export async function loadChannelCampaigns(request: Request, channel: CampaignChannel) {
  await requireMarketingAdmin({ request });
  const page = parsePage(new URL(request.url).searchParams.get('page'));

  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingCampaignController.list({ query: { page, size: LIST_PAGE_SIZE, channel } }),
    );
    return {
      campaigns: response.data?.data ?? [],
      pagination: readPagination(response.data?.meta?.pagination, page),
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente kampanjer');
    return { campaigns: [] as CampaignSummaryDto[], pagination: EMPTY_PAGINATION, error: message };
  }
}

export type ChannelCampaignsData = Awaited<ReturnType<typeof loadChannelCampaigns>>;

/** The customers who said yes to one channel, newest yes first, 25 per page (`?page=`). */
export async function loadChannelRecipients(request: Request, channel: CampaignChannel) {
  await requireMarketingAdmin({ request });
  const page = parsePage(new URL(request.url).searchParams.get('page'));

  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingRecipientController.recipients({ query: { page, size: LIST_PAGE_SIZE, channel } }),
    );
    return {
      recipients: response.data?.data ?? [],
      pagination: readPagination(response.data?.meta?.pagination, page),
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente mottakere');
    return { recipients: [] as MarketingRecipientDto[], pagination: EMPTY_PAGINATION, error: message };
  }
}

export type ChannelRecipientsData = Awaited<ReturnType<typeof loadChannelRecipients>>;
