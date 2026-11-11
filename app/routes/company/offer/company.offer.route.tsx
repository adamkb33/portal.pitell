import { Link, Form } from 'react-router';
import { FileText, Send, CheckCircle2, XCircle } from 'lucide-react';
import type { Route } from './+types/company.offer.route';
import { Offer, type OfferDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { OfferStatusBadge } from './_components';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import {
  formatOfferDate,
  getCompanyOfferDetailHref,
  OFFER_STATUS_LABELS,
  OFFER_STATUS_OPTIONS,
  parseOfferStatus,
} from './_utils';
import {
  Button,
  CompanyEmptyState,
  CompanyPageTemplate,
  KpiCard,
  Notice,
  Panel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/ui';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: { label: 'Nytt tilbud', to: ROUTES_MAP['company.offer.create'].href },
} satisfies CreateActionHandle;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const status = parseOfferStatus(url.searchParams.get('status'));

  try {
    const response = await withAuth(request, () => Offer.getOffers(status ? { query: { status } } : undefined));

    return {
      offers: response.data?.data ?? [],
      status,
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente tilbud');
    return {
      offers: [] as OfferDto[],
      status,
      error: message,
    };
  }
}

export default function CompanyOfferRoute({ loaderData }: Route.ComponentProps) {
  const { offers, status, error } = loaderData;
  const summary = createSummary(offers);

  return (
    <CompanyPageTemplate
      title="Tilbud"
      description="Oversikt over tilbud for valgt selskap. Første versjon viser status, frist og enkel oppfølging."
      label="Tilbud"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES_MAP['company.offer.catalog'].href}>Varekatalog</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES_MAP['company.offer'].href}>Oppdater</Link>
          </Button>
          <PageCreateButton size="sm" />
        </div>
      }
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Totalt" value={offers.length} icon={<FileText className="h-5 w-5" />} tone="primary" />
          <KpiCard label="Utkast" value={summary.DRAFT} icon={<FileText className="h-5 w-5" />} tone="info" />
          <KpiCard label="Sendt" value={summary.SENT} icon={<Send className="h-5 w-5" />} tone="warning" />
          <KpiCard
            label="Akseptert"
            value={summary.ACCEPTED}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="success"
          />
        </div>
      }
    >
      <Panel title="Filter" description="Filtrer tilbudslisten etter backend-status.">
        <Form method="get" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm text-text-primary">
            <span className="font-medium">Status</span>
            <select
              name="status"
              defaultValue={status ?? ''}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
            >
              <option value="">Alle</option>
              {OFFER_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {OFFER_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm">
            Bruk filter
          </Button>
        </Form>
      </Panel>

      {error ? (
        <Notice tone="emphasis" title="Kunne ikke hente tilbud" message={error} />
      ) : offers.length === 0 ? (
        <CompanyEmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Ingen tilbud funnet"
          description="Det finnes ingen tilbud for valgt filter ennå."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Mal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gyldig til</TableHead>
              <TableHead>Revisjon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell>
                  <Link to={getCompanyOfferDetailHref(offer.id)} className="text-interactive hover:underline">
                    #{offer.id}
                  </Link>
                </TableCell>
                <TableCell>{offer.customerId}</TableCell>
                <TableCell>{offer.templateId}</TableCell>
                <TableCell>
                  <OfferStatusBadge status={offer.status} />
                </TableCell>
                <TableCell>{formatOfferDate(offer.validUntil)}</TableCell>
                <TableCell>{offer.revision}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CompanyPageTemplate>
  );
}

function createSummary(offers: OfferDto[]) {
  return offers.reduce(
    (acc, offer) => {
      acc[offer.status] += 1;
      return acc;
    },
    { DRAFT: 0, SENT: 0, ACCEPTED: 0, DECLINED: 0, CANCELLED: 0 },
  );
}
