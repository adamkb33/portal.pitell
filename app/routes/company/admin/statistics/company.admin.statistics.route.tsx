import { Link } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import type { Route } from './+types/company.admin.statistics.route';
import { Activity, Clock, Contact, Mail, Shield, Users } from 'lucide-react';
import { AdminCompanyController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  CompanyEmptyState,
  CompanyPageTemplate,
  KpiCard,
  Panel,
  Text,
} from '~/ui';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const metrics = await withAuth(request, async () => AdminCompanyController.getDashboardMetrics());
    if (!metrics.data) {
      throw Error('Det sjekke en feil, kontakt support');
    }

    return {
      metrics: metrics.data.data,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente administrasjonsdata.');
    return { error: message };
  }
}

export default function CompanyAdminStatisticsRoute({ loaderData }: Route.ComponentProps) {
  const { metrics, error } = loaderData;

  if (error || !metrics) {
    return (
      <CompanyPageTemplate
        title="Statistikk"
        description="Brukere, invitasjoner og kontaktinnsikt."
        routeLinks={
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES_MAP['company.admin'].href}>Tilbake til administrasjon</Link>
          </Button>
        }
      >
        <CompanyEmptyState
          icon={<Shield className="h-6 w-6" />}
          title="Kunne ikke hente administrasjonsdata"
          description={error ?? 'Det oppstod en feil ved lasting av administrasjonsoversikten.'}
        />
      </CompanyPageTemplate>
    );
  }

  return (
    <CompanyPageTemplate
      title="Statistikk"
      description="Brukere, invitasjoner og kontaktinnsikt."
      routeLinks={
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES_MAP['company.admin'].href}>Tilbake til administrasjon</Link>
        </Button>
      }
      label="Selskapsadministrasjon"
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            label="Totalt brukere"
            value={metrics.overview.totalUsers}
            icon={<Users className="h-5 w-5" />}
            tone="primary"
          />
          <KpiCard
            label="Aktive siste 30 dager"
            value={metrics.users.activeLastThirtyDays}
            icon={<Activity className="h-5 w-5" />}
            tone="success"
          />
          <KpiCard
            label="Totalt kontakter"
            value={metrics.contacts.totalContacts}
            icon={<Contact className="h-5 w-5" />}
            tone="info"
          />
        </div>
      }
    >
      <Accordion type="multiple" defaultValue={[]} className="space-y-2">
        <AccordionItem value="users">
          <AccordionTrigger>
            <HeaderContent
              icon={<Users className="h-4 w-4" />}
              title="Brukere"
              description="Aktivitet, fordeling og nylig aktive brukere."
            />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <MetricTile label="Aktive brukere" value={metrics.users.totalActive} />
                <MetricTile label="Nye denne måneden" value={metrics.users.newThisMonth} />
                <MetricTile label="Inaktive" value={metrics.users.inactiveUsers} />
                <MetricTile label="Snittalder konto" value={`${metrics.users.averageAccountAgeDays} dager`} />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Rollefordeling" description="Antall brukere per rolle.">
                  <div className="space-y-2">
                    {Object.entries(metrics.overview.roleDistribution).map(([role, count]) => (
                      <KeyValueRow key={role} label={role} value={count} />
                    ))}
                  </div>
                </Panel>
                <Panel title="Sist aktive brukere" description="Nylig aktivitet for de siste registrerte brukerne.">
                  <div className="space-y-2">
                    {metrics.users.lastActiveUsers.length > 0 ? (
                      metrics.users.lastActiveUsers.map((user) => (
                        <KeyValueRow
                          key={user.userId}
                          label={[user.givenName, user.familyName].filter(Boolean).join(' ') || user.email}
                          value={formatDate(user.lastActiveAt)}
                          helper={user.email}
                        />
                      ))
                    ) : (
                      <Text as="p" variant="body-sm" className="text-text-secondary">
                        Ingen nylig aktivitet registrert.
                      </Text>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="invitations">
          <AccordionTrigger>
            <HeaderContent
              icon={<Mail className="h-4 w-4" />}
              title="Invitasjoner"
              description="Oversikt over invitasjoner og akseptanse."
            />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-5">
                <MetricTile label="Ventende" value={metrics.invitations.pending} />
                <MetricTile label="Utløpt" value={metrics.invitations.expired} />
                <MetricTile label="Totalt sendt" value={metrics.invitations.totalSent} />
                <MetricTile label="Brukt" value={metrics.invitations.totalUsed} />
                <MetricTile label="Akseptanse" value={`${metrics.invitations.acceptanceRate}%`} />
              </div>
              <Panel title="Siste invitasjoner" description="Nylig sendte invitasjoner og status.">
                <div className="space-y-2">
                  {metrics.invitations.recentInvites.length > 0 ? (
                    metrics.invitations.recentInvites.map((invite) => (
                      <KeyValueRow
                        key={`${invite.email}-${invite.sentAt}`}
                        label={invite.email}
                        value={invite.used ? 'Brukt' : 'Venter'}
                        helper={`Sendt ${formatDate(invite.sentAt)} · Utløper ${formatDate(invite.expiresAt)}`}
                      />
                    ))
                  ) : (
                    <Text as="p" variant="body-sm" className="text-text-secondary">
                      Ingen invitasjoner registrert.
                    </Text>
                  )}
                </div>
              </Panel>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="security">
          <AccordionTrigger>
            <HeaderContent
              icon={<Shield className="h-4 w-4" />}
              title="Sikkerhet og produkter"
              description="Aktive produkter og sikkerhetsrelaterte nøkkeltall."
            />
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Sikkerhet" description="Sentrale sikkerhetsmålinger for de siste 30 dagene.">
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Aktive sesjoner" value={metrics.security.activeSessions} />
                  <MetricTile label="Passordreset" value={metrics.security.passwordResetsLastThirtyDays} />
                  <MetricTile label="Tilbakekalte tokens" value={metrics.security.revokedTokensLastThirtyDays} />
                </div>
              </Panel>
              <Panel title="Aktiverte produkter" description="Produkter som er aktivert for selskapet.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {metrics.overview.enabledProducts.length > 0 ? (
                    metrics.overview.enabledProducts.map((product) => (
                      <Badge key={product} variant="info" className="justify-self-start">
                        {product}
                      </Badge>
                    ))
                  ) : (
                    <Text as="p" variant="body-sm" className="text-text-secondary">
                      Ingen produkter aktivert.
                    </Text>
                  )}
                </div>
              </Panel>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="contacts">
          <AccordionTrigger>
            <HeaderContent
              icon={<Contact className="h-4 w-4" />}
              title="Kontakter"
              description="Datakvalitet og nylig opprettede kontakter."
            />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <MetricTile label="Totalt kontakter" value={metrics.contacts.totalContacts} />
                <MetricTile label="Komplett kontaktinfo" value={metrics.contacts.contactsWithCompleteInfo} />
              </div>
              <Panel title="Siste kontakter" description="Nylig opprettede kontakter i selskapet.">
                <div className="space-y-2">
                  {metrics.contacts.recentContacts.length > 0 ? (
                    metrics.contacts.recentContacts.map((contact) => (
                      <KeyValueRow
                        key={contact.contactId}
                        label={
                          [contact.givenName, contact.familyName].filter(Boolean).join(' ') ||
                          `Kontakt #${contact.contactId}`
                        }
                        value={formatDate(contact.createdAt)}
                        helper={`${contact.hasEmail ? 'E-post' : 'Ingen e-post'} · ${contact.hasMobile ? 'Mobil' : 'Ingen mobil'}`}
                      />
                    ))
                  ) : (
                    <Text as="p" variant="body-sm" className="text-text-secondary">
                      Ingen nylig opprettede kontakter.
                    </Text>
                  )}
                </div>
              </Panel>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Panel title="Selskapssammendrag" description="Grunnleggende administrativ status for selskapet.">
        <div className="grid gap-3 md:grid-cols-2">
          <KeyValueRow
            label="Opprettet"
            value={formatDate(metrics.overview.accountCreatedAt)}
            icon={<Clock className="h-4 w-4" />}
          />
          <KeyValueRow
            label="Aktive produkter"
            value={metrics.overview.enabledProducts.length}
            icon={<Shield className="h-4 w-4" />}
          />
        </div>
      </Panel>
    </CompanyPageTemplate>
  );
}

function HeaderContent({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface text-text-secondary">{icon}</div>
      <div className="space-y-0.5">
        <Text as="p" variant="heading-sm">
          {title}
        </Text>
        <Text as="p" variant="body-sm" className="text-text-secondary">
          {description}
        </Text>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: React.ReactNode }) {
  return <KpiCard label={label} value={value} tone="primary" />;
}

function KeyValueRow({
  label,
  value,
  helper,
  icon,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border pb-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-text-secondary">{icon}</span> : null}
            <Text as="p" variant="label">
              {label}
            </Text>
          </div>
          {helper ? (
            <Text as="p" variant="caption" className="text-text-secondary">
              {helper}
            </Text>
          ) : null}
        </div>
        <Text as="p" variant="body-sm" className="shrink-0 text-text-secondary">
          {value}
        </Text>
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}
