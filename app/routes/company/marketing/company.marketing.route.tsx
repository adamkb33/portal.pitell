import { Link } from 'react-router';
import { useMemo } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import type { Route } from './+types/company.marketing.route';
import { CompanyUserMarketingCampaignController, type CampaignSummaryDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, PageNotice } from '~/ui';
import { loader as requireMarketingAdmin } from './company.marketing.layout';
import { CampaignListRow } from './_components/campaign-list-row';
import { ListFooter } from './_components/list-footer';
import { groupCampaignsByMonth, parsePage, pluralize } from './_utils/campaigns';

const PAGE_SIZE = 10;

export async function loader({ request }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });

  const page = parsePage(new URL(request.url).searchParams.get('page'));

  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingCampaignController.list({ query: { page, size: PAGE_SIZE } }),
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

export default function CompanyMarketingRoute({ loaderData }: Route.ComponentProps) {
  const { campaigns, pagination, error } = loaderData;
  const groups = useMemo(() => groupCampaignsByMonth(campaigns), [campaigns]);
  const isEmpty = !error && pagination.totalElements === 0;
  const createHref = ROUTES_MAP['company.marketing.create'].href;
  const newCampaignButton = (className?: string) => (
    <Button asChild className={className}>
      <Link to={createHref}>
        <Plus className="h-4 w-4" aria-hidden /> Ny kampanje
      </Link>
    </Button>
  );

  return (
    <CompanyPageTemplate title="Markedsføring">
      {/* The empty state has its own button, so the page never shows two. */}
      {isEmpty ? null : <div className="flex justify-end">{newCampaignButton('h-11 w-full px-4 sm:w-auto')}</div>}

      {error ? (
        <PageNotice title="Kunne ikke hente kampanjer" />
      ) : isEmpty ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-marketing-email-soft text-marketing-email">
            <Megaphone className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-base font-semibold text-text-primary">Ingen kampanjer ennå</p>
          {newCampaignButton()}
        </section>
      ) : (
        <section
          aria-label="Kampanjer"
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
        >
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="border-t border-border first:border-t-0">
              <h3 className="flex items-center justify-between gap-3 border-b border-border bg-surface-primary-subtle px-4 py-1.5 text-xs font-semibold text-text-primary sm:px-5">
                <span>{group.label}</span>
                <span className="font-normal text-text-secondary">
                  {pluralize(group.items.length, 'kampanje', 'kampanjer')}
                </span>
              </h3>
              <ul className="divide-y divide-border">
                {group.items.map((campaign) => (
                  <li key={campaign.id}>
                    <CampaignListRow campaign={campaign} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <ListFooter
            total={pluralize(pagination.totalElements, 'kampanje', 'kampanjer')}
            page={pagination.page}
            totalPages={pagination.totalPages}
          />
        </section>
      )}
    </CompanyPageTemplate>
  );
}
