import { useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import type { Route } from './+types/company.marketing.campaigns.route';
import { CompanyUserMarketingCampaignController, type CampaignSummaryDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { LIST_PAGE_SIZE } from '~/lib/list-page-size';
import type { CreateActionHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { CompanyPageTemplate, ListBody, ListCard, ListEmpty, ListFooter, ListRows, ListStrip, PageNotice } from '~/ui';
import { loader as requireMarketingAdmin } from '../company.marketing.layout';
import { CampaignListRow } from '../_components/campaign-list-row';
import { groupCampaignsByMonth, parsePage, pluralize } from '../_utils/campaigns';

export const handle = {
  createAction: { label: 'Ny kampanje', to: ROUTES_MAP['company.marketing.create'].href },
} satisfies CreateActionHandle;

export async function loader({ request }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });

  const page = parsePage(new URL(request.url).searchParams.get('page'));

  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingCampaignController.list({ query: { page, size: LIST_PAGE_SIZE } }),
    );
    // Paged endpoints return the rows in `data` and the page facts in `meta.pagination`.
    const pagination = response.data?.meta?.pagination;
    return {
      campaigns: response.data?.data ?? [],
      pagination: {
        page: pagination?.page ?? page,
        totalElements: pagination?.totalElements ?? 0,
        totalPages: Math.max(1, pagination?.totalPages ?? 1),
      },
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente kampanjer');
    return {
      campaigns: [] as CampaignSummaryDto[],
      pagination: { page: 0, totalElements: 0, totalPages: 1 },
      error: message,
    };
  }
}

/**
 * Kampanjer (Liste, approved domain sketch 2026-11-18, on the list standard): the campaigns by the month they started,
 * newest first. "Ny kampanje" is the page's create action (desktop button here, the phone button above the bottom
 * menu).
 */
export default function CompanyMarketingCampaignsRoute({ loaderData }: Route.ComponentProps) {
  const { campaigns, pagination, error } = loaderData;
  const groups = useMemo(() => groupCampaignsByMonth(campaigns), [campaigns]);

  return (
    <CompanyPageTemplate title="Kampanjer">
      <div className="hidden justify-end lg:flex">
        <PageCreateButton />
      </div>

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
            {pagination.totalElements === 0 ? <ListEmpty icon={Megaphone} title="Ingen kampanjer ennå" /> : null}
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
