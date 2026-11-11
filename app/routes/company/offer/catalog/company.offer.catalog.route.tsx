import { Form, Link, data } from 'react-router';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import type { Route } from './+types/company.offer.catalog.route';
import { Offer, type OfferCatalogItemDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  Button,
  CompanyPageTemplate,
  Input,
  Notice,
  Panel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/ui';
import { formatOfferCurrency } from '../_utils';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const response = await withAuth(request, () => Offer.getCatalogItems());
    return data({
      items: response.data?.data ?? [],
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente varekatalog.');
    return data({ items: [] as OfferCatalogItemDto[], error: message }, { status: status ?? 400 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  try {
    await withAuth(request, async () => {
      if (intent === 'create') {
        const name = String(formData.get('name') ?? '').trim();
        const defaultUnitPrice = Number(formData.get('defaultUnitPrice'));
        const defaultVatRateRaw = String(formData.get('defaultVatRate') ?? '').trim();
        const defaultVatRate = defaultVatRateRaw ? Number(defaultVatRateRaw) : undefined;

        if (!name) {
          throw new Error('Navn er påkrevd.');
        }

        if (!Number.isFinite(defaultUnitPrice) || defaultUnitPrice < 0) {
          throw new Error('Standardpris må være 0 eller høyere.');
        }

        await Offer.createCatalogItem({
          body: {
            name,
            defaultUnitPrice,
            defaultVatRate,
          },
        });
        return;
      }

      if (intent === 'deactivate') {
        const catalogItemId = Number(formData.get('catalogItemId'));
        if (!Number.isFinite(catalogItemId)) {
          throw new Error('Ugyldig katalogelement.');
        }

        await Offer.deactivateCatalogItem({ path: { catalogItemId } });
        return;
      }

      throw new Error('Ukjent handling.');
    });

    return data({ ok: true, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke oppdatere varekatalog.');
    return data({ ok: false, error: message }, { status: status ?? 400 });
  }
}

export default function CompanyOfferCatalogRoute({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <CompanyPageTemplate
      title="Varekatalog"
      description="Enkel katalog for standardlinjer som kan kopieres inn i tilbud."
      label="Tilbud"
      routeLinks={
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES_MAP['company.offer'].href}>Tilbake til tilbud</Link>
        </Button>
      }
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-4">
            <Briefcase className="mb-2 size-5 text-text-secondary" aria-hidden />
            <p className="text-xs font-medium text-text-secondary">Katalogelementer</p>
            <p className="text-2xl font-bold text-text-primary">{loaderData.items.length}</p>
          </div>
        </div>
      }
    >
      {loaderData.error ? (
        <Notice tone="emphasis" title="Kunne ikke hente varekatalog" message={loaderData.error} />
      ) : null}
      {actionData?.error ? (
        <Notice tone="emphasis" title="Kunne ikke oppdatere varekatalog" message={actionData.error} />
      ) : null}
      {actionData?.ok ? <Notice title="Oppdatert" message="Varekatalogen er oppdatert." /> : null}

      <Panel
        title="Nytt katalogelement"
        description="Opprett en standardlinje som senere kan kopieres inn i et tilbud."
      >
        <Form method="post" className="grid gap-3 md:grid-cols-[1fr_10rem_8rem_auto] md:items-end">
          <input type="hidden" name="intent" value="create" />
          <label className="grid gap-1 text-sm text-text-primary">
            <span className="font-medium">Navn</span>
            <Input name="name" required />
          </label>
          <label className="grid gap-1 text-sm text-text-primary">
            <span className="font-medium">Pris</span>
            <Input name="defaultUnitPrice" type="number" min="0" step="0.01" required />
          </label>
          <label className="grid gap-1 text-sm text-text-primary">
            <span className="font-medium">MVA %</span>
            <Input name="defaultVatRate" type="number" min="0" step="0.01" placeholder="25" />
          </label>
          <Button type="submit">
            <Plus className="size-4" aria-hidden />
            Legg til
          </Button>
        </Form>
      </Panel>

      <Panel title="Katalog" description="Deaktivering gjør elementet utilgjengelig for nye tilbud.">
        {loaderData.items.length === 0 ? (
          <p className="text-sm text-text-secondary">Ingen katalogelementer ennå.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Pris</TableHead>
                <TableHead>MVA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Handling</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loaderData.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{formatOfferCurrency(item.defaultUnitPrice)}</TableCell>
                  <TableCell>{item.defaultVatRate}%</TableCell>
                  <TableCell>{item.active ? 'Aktiv' : 'Inaktiv'}</TableCell>
                  <TableCell>
                    <Form method="post">
                      <input type="hidden" name="intent" value="deactivate" />
                      <input type="hidden" name="catalogItemId" value={item.id} />
                      <Button type="submit" size="sm" variant="outline" disabled={!item.active}>
                        <Trash2 className="size-4" aria-hidden />
                        Deaktiver
                      </Button>
                    </Form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </CompanyPageTemplate>
  );
}
