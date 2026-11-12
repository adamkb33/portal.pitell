import { data, NavLink } from 'react-router';
import type { Route } from './+types/system-admin.diagnostics.booking.route';
import { Diagnostic } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardGrid,
  CardHead,
  CompanyPageTemplate,
  GridCol,
  Icon,
  Panel,
  Text,
  PageNotice,
} from '~/ui';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;

  try {
    const response = await withAuth(request, () =>
      Diagnostic.flows({
        query: {
          from,
          to,
        },
      }),
    );
    return data({ flowsData: response.data?.data ?? null, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente booking-diagnostikk.');
    return data({ flowsData: null, error: message }, { status: status ?? 400 });
  }
}

export default function SystemAdminDiagnosticsBookingPage({ loaderData }: Route.ComponentProps) {
  const flowLinkById: Record<string, string> = {
    PUBLIC_APPOINTMENT_CANCELLATION_BY_TOKEN:
      ROUTES_MAP['system-admin.diagnostics.booking.public-appointment-cancellation-by-token'].href,
  };

  return (
    <CompanyPageTemplate
      title="Diagnostikk: Booking"
      description="Tilgjengelige diagnostikk-flyter for booking."
      routeLinks={
        <Button asChild variant="outline">
          <NavLink to={ROUTES_MAP['system-admin.diagnostics'].href}>Tilbake til diagnostikk</NavLink>
        </Button>
      }
    >
      {loaderData.error ? <PageNotice title="Kunne ikke hente booking-flyter" /> : null}

      <Panel title="Flyter" description="Status per diagnostikkflyt.">
        {loaderData.flowsData?.flows?.length ? (
          <CardGrid gap="md">
            {loaderData.flowsData.flows.map((flow) => {
              const href = flowLinkById[flow.id];

              return (
                <GridCol key={flow.id} span={12}>
                  <Card as="article" size="sm">
                    <CardHead
                      eyebrow={flow.status}
                      heading={flow.title}
                      action={
                        href ? (
                          <CardAction asChild>
                            <NavLink to={href}>
                              Åpne
                              <Icon name="arrow-right" />
                            </NavLink>
                          </CardAction>
                        ) : null
                      }
                    />
                    <CardContent className="space-y-1">
                      <Text as="p" variant="caption" className="text-text-secondary">
                        Severity: {flow.severity} · Errors: {flow.totalCount}
                      </Text>
                      <Text as="p" variant="caption" className="text-text-secondary">
                        Siste feil: {flow.lastOccurredAt ?? '—'}
                      </Text>
                    </CardContent>
                  </Card>
                </GridCol>
              );
            })}
          </CardGrid>
        ) : (
          <Text as="p" variant="body-sm" className="text-text-secondary">
            Ingen flyter tilgjengelig.
          </Text>
        )}
      </Panel>
    </CompanyPageTemplate>
  );
}
