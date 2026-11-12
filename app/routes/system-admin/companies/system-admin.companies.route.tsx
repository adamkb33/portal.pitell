import { OSLO_TZ } from '~/lib/oslo-time';
import { NavLink, data } from 'react-router';
import type { Route } from './+types/system-admin.companies.route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import {
  Badge,
  Button,
  CompanyPageTemplate,
  Panel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  PageNotice,
} from '~/ui';
import {
  DEFAULT_COMPANY_PAGE_SIZE,
  DEFAULT_COMPANY_SORT,
  formatCompanyOptionLabel,
  parseNonNegativeInteger,
  parsePositiveInteger,
} from './_utils/system-admin-company-display';
import { loadSystemAdminCompanies } from './_utils/system-admin-companies.server';

function buildCompaniesHref(query: { page?: number; size?: number; sort?: string }) {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size !== undefined) params.set('size', String(query.size));
  if (query.sort) params.set('sort', query.sort);
  const queryString = params.toString();
  return `${ROUTES_MAP['system-admin.companies'].href}${queryString ? `?${queryString}` : ''}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short', timeZone: OSLO_TZ }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parseNonNegativeInteger(url.searchParams.get('page')) ?? 0;
  const size = parsePositiveInteger(url.searchParams.get('size')) ?? DEFAULT_COMPANY_PAGE_SIZE;
  const sort = url.searchParams.get('sort') || DEFAULT_COMPANY_SORT;

  try {
    const companies = await loadSystemAdminCompanies(request, { page, size, sort });
    return data({ companies, query: { page, size, sort }, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente selskaper.');
    return data(
      {
        companies: null,
        query: { page, size, sort },
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export default function SystemAdminCompaniesPage({ loaderData }: Route.ComponentProps) {
  const companies = loaderData.companies;
  const page = companies?.page ?? loaderData.query.page;
  const size = companies?.size ?? loaderData.query.size;
  const sort = loaderData.query.sort;

  return (
    <CompanyPageTemplate
      title="Systemadmin: Selskaper"
      description="Finn selskap og gå videre til relevante handlinger."
    >
      {loaderData.error ? <PageNotice title="Kunne ikke hente selskaper" /> : null}

      <Panel title="Handlinger" description="Velg ønsket handling.">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies.create'].href}>Opprett selskap</NavLink>
          </Button>
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies.roles'].href}>Tildel roller</NavLink>
          </Button>
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies.products'].href}>Tildel produkter</NavLink>
          </Button>
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies.products.delete'].href}>Fjern produkter</NavLink>
          </Button>
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies.reviews'].href}>Google reviews</NavLink>
          </Button>
        </div>
      </Panel>

      <Panel
        title="Selskaper"
        description={
          companies ? `${companies.totalElements} selskaper totalt` : 'Ingen selskapsliste er tilgjengelig akkurat nå.'
        }
      >
        {companies && companies.content.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Selskap</TableHead>
                  <TableHead>Org.nr</TableHead>
                  <TableHead>Google</TableHead>
                  <TableHead>Opprettet</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.content.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Text as="p" variant="body-sm" className="font-semibold text-text-primary">
                          {formatCompanyOptionLabel(company)}
                        </Text>
                        <Text as="p" variant="caption" className="text-text-secondary">
                          ID {company.id}
                        </Text>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">{company.orgNum}</TableCell>
                    <TableCell className="align-top">
                      {company.googlePlaceId ? (
                        <Badge variant={company.syncEnabled ? 'success' : 'warning'} size="sm">
                          {company.syncEnabled ? 'Sync aktiv' : 'Place ID'}
                        </Badge>
                      ) : (
                        <Badge variant="muted" size="sm">
                          Ikke satt
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top">{formatDateTime(company.createdAt)}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <NavLink to={`${ROUTES_MAP['system-admin.companies.roles'].href}?companyId=${company.id}`}>
                            Roller
                          </NavLink>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <NavLink to={`${ROUTES_MAP['system-admin.companies.products'].href}?companyId=${company.id}`}>
                            Produkter
                          </NavLink>
                        </Button>
                        {company.googlePlaceId ? (
                          <Button asChild variant="outline" size="sm">
                            <NavLink
                              to={`${ROUTES_MAP['system-admin.companies.reviews'].href}?companyId=${company.id}`}
                            >
                              Reviews
                            </NavLink>
                          </Button>
                        ) : (
                          <Button asChild variant="outline" size="sm">
                            <NavLink
                              to={`${ROUTES_MAP['system-admin.companies.reviews'].href}?companyId=${company.id}`}
                            >
                              Legg til Place ID
                            </NavLink>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Text as="p" variant="caption" className="text-text-secondary">
                Side {companies.totalPages === 0 ? 0 : page + 1} av {companies.totalPages}
              </Text>
              <div className="flex gap-2">
                {companies.hasPrevious ? (
                  <Button asChild variant="outline" size="sm">
                    <NavLink to={buildCompaniesHref({ page: page - 1, size, sort })}>Forrige</NavLink>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Forrige
                  </Button>
                )}
                {companies.hasNext ? (
                  <Button asChild variant="outline" size="sm">
                    <NavLink to={buildCompaniesHref({ page: page + 1, size, sort })}>Neste</NavLink>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Neste
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <Text as="p" variant="body-sm" className="text-text-secondary">
            Ingen selskaper funnet.
          </Text>
        )}
      </Panel>
    </CompanyPageTemplate>
  );
}
