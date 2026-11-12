import { OSLO_TZ } from '~/lib/oslo-time';
import { data, Form, NavLink } from 'react-router';
import type { Route } from './+types/system-admin.companies.reviews.route';
import {
  Base,
  type PaginatedResponseSystemAdminReviewDto,
  type SystemAdminCompanyDto,
  type SystemAdminReviewDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  Badge,
  Button,
  Checkbox,
  CompanyPageTemplate,
  FormField,
  Notice,
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
import { SystemAdminCompanySelect } from '../_components/system-admin-company-select';
import { loadSystemAdminCompanyOptions } from '../_utils/system-admin-companies.server';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT = 'lastSeenAt,desc';

function parseInteger(value: string | null, options: { min?: number; max?: number } = {}): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  if (options.min !== undefined && parsed < options.min) return undefined;
  if (options.max !== undefined && parsed > options.max) return undefined;
  return parsed;
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

function buildReviewsHref(query: { companyId?: number; page?: number; size?: number; sort?: string }) {
  const params = new URLSearchParams();
  if (query.companyId !== undefined) params.set('companyId', String(query.companyId));
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size !== undefined) params.set('size', String(query.size));
  if (query.sort) params.set('sort', query.sort);
  const queryString = params.toString();
  return `${ROUTES_MAP['system-admin.companies.reviews'].href}${queryString ? `?${queryString}` : ''}`;
}

function RatingBadge({ rating }: { rating: number }) {
  const variant = rating >= 4 ? 'success' : rating >= 3 ? 'warning' : 'danger';
  return (
    <Badge variant={variant} size="sm">
      {rating}/5
    </Badge>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const companyId = parseInteger(url.searchParams.get('companyId'), { min: 1 });
  const page = parseInteger(url.searchParams.get('page'), { min: 0 }) ?? 0;
  const size = parseInteger(url.searchParams.get('size'), { min: 1, max: 100 }) ?? DEFAULT_PAGE_SIZE;
  const sort = url.searchParams.get('sort') || DEFAULT_SORT;

  const query = { companyId, page, size, sort };
  let companies: SystemAdminCompanyDto[] = [];
  let loadError: string | null = null;

  try {
    companies = await loadSystemAdminCompanyOptions(request);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente selskaper.');
    loadError = message;
  }

  if (companyId === undefined) {
    return data({
      companies,
      reviewsPage: null as PaginatedResponseSystemAdminReviewDto | null,
      query,
      error: null as string | null,
      loadError,
    });
  }

  const selectedCompany = companyId ? companies.find((company) => company.id === companyId) : undefined;
  if (selectedCompany && !selectedCompany.googlePlaceId) {
    return data({
      companies,
      reviewsPage: null as PaginatedResponseSystemAdminReviewDto | null,
      query,
      error: null as string | null,
      loadError,
    });
  }

  try {
    const response = await withAuth(request, () =>
      Base.listReviews({
        query: { companyId, page, size, sort },
      }),
    );

    return data({
      companies,
      reviewsPage: response.data?.data ?? null,
      query,
      error: null as string | null,
      loadError,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente Google reviews.');
    return data(
      {
        companies,
        reviewsPage: null,
        query,
        error: message,
        loadError,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? 'sync');
  const companyId = Number(formData.get('companyId'));

  if (!Number.isInteger(companyId) || companyId < 1) {
    const message = 'Gyldig selskap er påkrevd.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  if (intent === 'update-google-place-id') {
    const googlePlaceId = String(formData.get('googlePlaceId') ?? '').trim();

    if (!googlePlaceId) {
      const message = 'Google Place ID er påkrevd.';
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }

    try {
      await withAuth(request, () =>
        Base.updateCompanyGooglePlaceId({
          path: { companyId },
          body: { googlePlaceId },
        }),
      );

      const flashCookie = await setFlashMessage(request, { type: 'success', text: 'Google Place ID oppdatert.' });
      return data({ error: null }, { headers: { 'Set-Cookie': flashCookie } });
    } catch (error) {
      const { message, status } = resolveErrorPayload(error, 'Kunne ikke oppdatere Google Place ID.');
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
    }
  }

  const fullRescrape = formData.get('fullRescrape') === 'on';

  try {
    const companies = await loadSystemAdminCompanyOptions(request);
    const company = companies.find((item) => item.id === companyId);
    if (!company?.googlePlaceId) {
      const message = 'Selskapet mangler Google Place ID og kan ikke synkroniseres.';
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke validere Google Place ID for selskapet.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () =>
      Base.syncCompanyReviews({
        path: { companyId },
        query: { fullRescrape },
      }),
    );

    const flashCookie = await setFlashMessage(request, { type: 'success', text: 'Google reviews synkronisert.' });
    return data({ error: null }, { headers: { 'Set-Cookie': flashCookie } });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke synkronisere Google reviews.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

function ReviewRow({ review }: { review: SystemAdminReviewDto }) {
  return (
    <TableRow>
      <TableCell className="min-w-52 align-top">
        <div className="space-y-1">
          <Text as="p" variant="body-sm" className="font-semibold text-text-primary">
            {review.companyName || `Selskap ${review.companyId}`}
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary">
            {review.companyOrgNum ?? `ID ${review.companyId}`}
          </Text>
        </div>
      </TableCell>
      <TableCell className="min-w-48 align-top">
        <div className="space-y-1">
          <Text as="p" variant="body-sm" className="font-semibold text-text-primary">
            {review.authorName}
          </Text>
          <Text as="p" variant="caption" className="text-text-secondary">
            {review.relativeTime}
          </Text>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <RatingBadge rating={review.rating} />
      </TableCell>
      <TableCell className="min-w-80 align-top">
        <div className="space-y-2">
          <Text as="p" variant="body-sm" className="whitespace-pre-wrap text-text-primary">
            {review.text || '—'}
          </Text>
          {review.ownerResponse ? (
            <Text as="p" variant="caption" className="whitespace-pre-wrap text-text-secondary">
              Svar: {review.ownerResponse}
            </Text>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-top">{formatDateTime(review.lastSeenAt)}</TableCell>
      <TableCell className="align-top">
        {review.stale ? (
          <Badge variant="warning" size="sm">
            Stale
          </Badge>
        ) : (
          <Badge variant="success" size="sm">
            Aktiv
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function SystemAdminCompaniesReviewsPage({ loaderData, actionData }: Route.ComponentProps) {
  const reviewsPage = loaderData.reviewsPage;
  const content = reviewsPage?.content ?? [];
  const companyIdValue = loaderData.query.companyId ?? '';
  const selectedCompany = loaderData.query.companyId
    ? loaderData.companies.find((company) => company.id === loaderData.query.companyId)
    : undefined;
  const page = reviewsPage?.page ?? loaderData.query.page;
  const size = reviewsPage?.size ?? loaderData.query.size;
  const sort = loaderData.query.sort;

  return (
    <CompanyPageTemplate
      title="Google reviews"
      description="Hent og synkroniser Google reviews for selskap via system-admin endpoints."
      routeLinks={
        <Button asChild variant="outline">
          <NavLink to={ROUTES_MAP['system-admin.companies'].href}>Tilbake til selskaper</NavLink>
        </Button>
      }
    >
      {loaderData.error ? <PageNotice title="Kunne ikke hente Google reviews" /> : null}
      {actionData?.error ? <Notice tone="emphasis" title="Handlingen feilet" message={actionData.error} /> : null}
      {loaderData.loadError ? <PageNotice title="Kunne ikke hente selskaper" /> : null}

      <Panel
        title="Google Place ID"
        description="Legg til eller oppdater Google Place ID før reviews hentes eller synkroniseres."
      >
        <Form method="post" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input type="hidden" name="intent" value="update-google-place-id" />
          <SystemAdminCompanySelect
            id="googlePlaceCompanyId"
            companies={loaderData.companies}
            defaultValue={companyIdValue}
          />
          <FormField
            label="Google Place ID"
            name="googlePlaceId"
            defaultValue={selectedCompany?.googlePlaceId ?? ''}
            required
          />
          <Button type="submit">Oppdater Place ID</Button>
        </Form>
      </Panel>

      <Panel title="Søk" description="Velg selskap for å hente lagrede Google reviews.">
        <Form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_220px_auto] md:items-end">
          <SystemAdminCompanySelect
            id="reviewCompanyId"
            companies={loaderData.companies}
            defaultValue={companyIdValue}
            requireGooglePlaceId
          />
          <FormField label="Sidestørrelse" name="size" type="number" min={1} max={100} defaultValue={size} />
          <FormField label="Sortering" name="sort" defaultValue={sort} />
          <input type="hidden" name="page" value="0" />
          <Button type="submit">Hent reviews</Button>
        </Form>
      </Panel>

      <Panel title="Synkronisering" description="Kjør backend-jobben som henter Google reviews for selskapet.">
        <Form method="post" className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <input type="hidden" name="intent" value="sync" />
          <SystemAdminCompanySelect
            id="syncCompanyId"
            companies={loaderData.companies}
            defaultValue={companyIdValue}
            requireGooglePlaceId
            helperText="Kun selskaper med Google Place ID kan synkroniseres."
          />
          <label className="flex min-h-10 items-center gap-2 text-sm text-text-primary md:mb-0.5">
            <Checkbox name="fullRescrape" />
            Full rescrape
          </label>
          <Button type="submit">Synkroniser reviews</Button>
        </Form>
      </Panel>

      <Panel
        title="Reviews"
        description={
          reviewsPage ? `${reviewsPage.totalElements} reviews funnet.` : 'Velg selskap for å vise Google reviews.'
        }
      >
        {reviewsPage ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" size="sm">
                Selskap {loaderData.query.companyId}
              </Badge>
              <Badge variant="outline" size="sm">
                {reviewsPage.totalElements} reviews
              </Badge>
            </div>

            {content.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Selskap</TableHead>
                    <TableHead>Forfatter</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Sist sett</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.map((review) => (
                    <ReviewRow key={review.id} review={review} />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Text as="p" variant="body-sm" className="text-text-secondary">
                Ingen reviews funnet for valgt selskap.
              </Text>
            )}

            {reviewsPage ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Text as="p" variant="caption" className="text-text-secondary">
                  Side {reviewsPage.totalPages === 0 ? 0 : page + 1} av {reviewsPage.totalPages}
                </Text>
                <div className="flex gap-2">
                  {reviewsPage.hasPrevious ? (
                    <Button asChild variant="outline" size="sm">
                      <NavLink
                        to={buildReviewsHref({ companyId: loaderData.query.companyId, page: page - 1, size, sort })}
                      >
                        Forrige
                      </NavLink>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Forrige
                    </Button>
                  )}
                  {reviewsPage.hasNext ? (
                    <Button asChild variant="outline" size="sm">
                      <NavLink
                        to={buildReviewsHref({ companyId: loaderData.query.companyId, page: page + 1, size, sort })}
                      >
                        Neste
                      </NavLink>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Neste
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <Text as="p" variant="body-sm" className="text-text-secondary">
            Søk med selskap-ID for å vise Google reviews.
          </Text>
        )}
      </Panel>
    </CompanyPageTemplate>
  );
}
