import { data, Form, NavLink } from 'react-router';
import type { Route } from './+types/system-admin.diagnostics.booking.public-appointment-cancellation-by-token.route';
import { Diagnostic } from '~/api/generated';
import type { SystemAdminCompanyDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, Input, Label, Panel, Text, PageNotice } from '~/ui';
import { SystemAdminCompanySelect } from '~/routes/system-admin/companies/_components/system-admin-company-select';
import { loadSystemAdminCompanyOptions } from '~/routes/system-admin/companies/_utils/system-admin-companies.server';

function parseInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

function asDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = {
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    eventType:
      (url.searchParams.get('eventType') as
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_BLANK'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_MALFORMED'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_SIGNATURE_INVALID'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_PAYLOAD_INVALID'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_EXPIRED'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_APPOINTMENT_NOT_FOUND'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_PROFILE_NOT_FOUND'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_PROVIDER_LOOKUP_FAILED'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_NOTIFICATION_FAILED'
        | 'PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN_FAILED'
        | null) ?? undefined,
    tokenHash: url.searchParams.get('tokenHash') || undefined,
    companyId: parseInteger(url.searchParams.get('companyId')),
    appointmentId: parseInteger(url.searchParams.get('appointmentId')),
    page: parseInteger(url.searchParams.get('page')),
    size: parseInteger(url.searchParams.get('size')),
  };
  let companies: SystemAdminCompanyDto[] = [];
  let loadError: string | null = null;

  try {
    companies = await loadSystemAdminCompanyOptions(request);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente selskaper.');
    loadError = message;
  }

  try {
    const response = await withAuth(request, () =>
      Diagnostic.publicAppointmentCancellationByToken({
        query,
      }),
    );
    return data({
      companies,
      tableData: response.data?.data ?? null,
      query,
      error: null as string | null,
      loadError,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente diagnostikk-tabell.');
    return data(
      {
        companies,
        tableData: null,
        query,
        error: message,
        loadError,
      },
      { status: status ?? 400 },
    );
  }
}

export default function SystemAdminDiagnosticsBookingPublicAppointmentCancellationByTokenPage({
  loaderData,
}: Route.ComponentProps) {
  const tableData = loaderData.tableData;

  return (
    <CompanyPageTemplate
      title="Booking diagnostikk: Public appointment cancellation by token"
      description="Detaljert hendelsestabell med backend-definerte felt og filtre."
      routeLinks={
        <Button asChild variant="outline">
          <NavLink to={ROUTES_MAP['system-admin.diagnostics.booking'].href}>Tilbake til booking-diagnostikk</NavLink>
        </Button>
      }
    >
      {loaderData.error ? <PageNotice title="Kunne ikke hente tabell" /> : null}
      {loaderData.loadError ? <PageNotice title="Kunne ikke hente selskaper" /> : null}

      <Panel title="Filtre" description="Server-side filtre">
        <Form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" defaultValue={loaderData.query.from ?? ''} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" defaultValue={loaderData.query.to ?? ''} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="eventType">Event type</Label>
            <Input id="eventType" name="eventType" defaultValue={loaderData.query.eventType ?? ''} />
          </div>
          <SystemAdminCompanySelect
            companies={loaderData.companies}
            defaultValue={loaderData.query.companyId ?? ''}
            required={false}
            helperText="La stå tom for alle selskaper."
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="appointmentId">Appointment ID</Label>
            <Input id="appointmentId" name="appointmentId" defaultValue={loaderData.query.appointmentId ?? ''} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tokenHash">Token hash</Label>
            <Input id="tokenHash" name="tokenHash" defaultValue={loaderData.query.tokenHash ?? ''} />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <Button type="submit" variant="outline">
              Oppdater
            </Button>
            <Button asChild variant="outline">
              <NavLink
                to={ROUTES_MAP['system-admin.diagnostics.booking.public-appointment-cancellation-by-token'].href}
              >
                Nullstill
              </NavLink>
            </Button>
          </div>
        </Form>
      </Panel>

      <Panel
        title={tableData?.table?.title ?? 'Diagnostikk-tabell'}
        description={tableData?.table?.description ?? undefined}
      >
        {tableData?.fields?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {tableData.fields.map((field) => (
                    <th
                      key={field.key}
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row) => {
                  const byKey = new Map(row.values.map((value) => [value.key, value]));
                  return (
                    <tr key={row.id} className="border-b border-border/60">
                      {tableData.fields.map((field) => {
                        const cell = byKey.get(field.key);
                        return (
                          <td key={`${row.id}:${field.key}`} className="px-3 py-2 text-sm text-text-primary">
                            {cell?.displayValue ?? asDisplayValue(cell?.value)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Text as="p" variant="body-sm" className="text-text-secondary">
            {tableData?.table?.emptyState ?? 'Ingen data tilgjengelig.'}
          </Text>
        )}

        {tableData?.pagination ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <Text as="p" variant="caption" className="text-text-secondary">
              Side {tableData.pagination.page + 1} av {tableData.pagination.totalPages}
            </Text>
          </div>
        ) : null}
      </Panel>
    </CompanyPageTemplate>
  );
}
