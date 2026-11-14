import { data } from 'react-router';
import { BarChart3, Contact, Users } from 'lucide-react';
import { AdminCompanyController, AdminCompanyUserController, CompanyUserController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyRow, OverviewRow } from '~/routes/company/_components/overview-rows';
import { KeyDestinationCard } from '~/routes/company/booking/_components/key-destination-card';
import { CompanyPageTemplate } from '~/ui';
import type { Route } from './+types/company.admin.route';

export async function loader({ request }: Route.LoaderArgs) {
  // Each part may fail on its own: the cards still open their pages with "–" instead of a number.
  const [metrics, employeeCount, company] = await Promise.all([
    withAuth(request, () => AdminCompanyController.getDashboardMetrics())
      .then((response) => response.data?.data ?? null)
      .catch(() => null),
    // Counted the way the Ansatte list counts, so the card and the list always agree.
    withAuth(request, () =>
      AdminCompanyUserController.getCompanyUsers({ query: { page: 0, size: 1, includeDeleted: false } }),
    )
      .then((response) => response.data?.data?.totalElements ?? null)
      .catch(() => null),
    withAuth(request, () => CompanyUserController.getCompanySummary())
      .then((response) => response.data?.data ?? null)
      .catch(() => null),
  ]);

  return data({
    employeeCount,
    contactCount: metrics?.contacts.totalContacts ?? null,
    followUps: metrics ? metrics.users.inactiveUsers.length + metrics.invitations.expiredInvites.length : null,
    company,
  });
}

/**
 * Administrasjon (Oversikt, approved sketch 2026-11-13): Ansatte and Kontakter are the key destinations (full-colour
 * cards with one number), then the company with "Endre" and Statistikk as rows.
 */
export default function CompanyAdminRoute({ loaderData }: Route.ComponentProps) {
  const { employeeCount, contactCount, followUps, company } = loaderData;

  return (
    <CompanyPageTemplate title="Administrasjon">
      <div className="flex max-w-140 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <KeyDestinationCard
            href={ROUTES_MAP['company.admin.employees'].href}
            label="Ansatte"
            icon={Users}
            tone="sky"
            count={employeeCount}
            countLabel={employeeCount === 1 ? 'ansatt' : 'ansatte'}
          />
          <KeyDestinationCard
            href={ROUTES_MAP['company.admin.contacts'].href}
            label="Kontakter"
            icon={Contact}
            tone="plum"
            count={contactCount}
            countLabel={contactCount === 1 ? 'kontakt' : 'kontakter'}
          />
        </div>

        <nav aria-label="Administrasjon" className="overflow-hidden rounded-xl border border-border bg-background">
          <ul className="divide-y divide-border">
            {company ? (
              <li>
                <CompanyRow company={company} editHref={ROUTES_MAP['company.admin.settings'].href} />
              </li>
            ) : null}
            <li>
              <OverviewRow
                to={ROUTES_MAP['company.admin.statistics'].href}
                icon={BarChart3}
                tone="bg-surface-variant-1 text-text-secondary"
                title="Statistikk"
                // Something to act on when there is; otherwise what the page covers (no "0 å følge opp").
                line={followUps ? `${followUps} å følge opp` : 'Tilgang og kontakter'}
              />
            </li>
          </ul>
        </nav>
      </div>
    </CompanyPageTemplate>
  );
}
