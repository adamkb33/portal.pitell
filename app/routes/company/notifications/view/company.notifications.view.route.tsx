import type { ReactNode } from 'react';
import { data, Link, useLocation } from 'react-router';
import { ArrowLeft, BellRing, Clock3, Eye } from 'lucide-react';
import type { Route } from './+types/company.notifications.view.route';
import { CompanyUserInAppNotificationController } from '~/api/generated/notification';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/route-tree';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { PageHeader } from '../../_components/page-header';
import { formatNotificationTimestamp } from '../_utils/format';
import { getNotificationHeadline } from '../_utils/query';

function parseNotificationId(idParam: string | undefined): number | null {
  if (!idParam) {
    return null;
  }

  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const id = parseNotificationId(params.id);
  if (id == null) {
    throw new Response('Ugyldig varsel-ID', { status: 400 });
  }

  try {
    const response = await withAuth(request, () =>
      CompanyUserInAppNotificationController.getInAppNotificationById({
        path: { id },
      }),
    );

    let notification = response.data?.data;
    if (!notification) {
      throw new Response('Fant ikke varselet', { status: 404 });
    }

    if (!notification.readAt) {
      const markAsReadResponse = await withAuth(request, () =>
        CompanyUserInAppNotificationController.markInAppNotificationAsRead({
          path: { id },
        }),
      );

      notification = markAsReadResponse.data?.data ?? notification;
    }

    return data({ notification });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente varselet');
    throw new Response(message, { status: status ?? 400 });
  }
}

export default function CompanyNotificationsViewRoute({ loaderData }: Route.ComponentProps) {
  const { notification } = loaderData;
  const location = useLocation();
  const search = location.search;
  const backHref = `${ROUTES_MAP['company.notifications'].href}${search}`;
  const isViewed = notification.readAt != null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={getNotificationHeadline(notification)}
        description="Detaljvisning av in-app varsel for innlogget bruker i valgt selskap."
        teaser="Meldingen vises i full lengde og følger samme uttrykk som resten av selskapsflatene."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Tilbake til varsler
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant={isViewed ? 'outline' : 'default'}>{isViewed ? 'Lest' : 'Ulest'}</Badge>
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
            Varsel #{notification.id}
          </Badge>
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4 text-primary" />
              Innhold
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <div className="rounded-xl border border-border/70 bg-background p-4 md:p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{notification.content}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base">Detaljer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <InfoRow
              icon={<Clock3 className="h-4 w-4 text-muted-foreground" />}
              label="Opprettet"
              value={formatNotificationTimestamp(notification.createdAt)}
            />
            <InfoRow
              icon={<BellRing className="h-4 w-4 text-muted-foreground" />}
              label="Oppdatert"
              value={formatNotificationTimestamp(notification.updatedAt ?? notification.createdAt)}
            />
            <InfoRow
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
              label="Lest"
              value={notification.readAt ? formatNotificationTimestamp(notification.readAt) : 'Ikke lest ennå'}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
