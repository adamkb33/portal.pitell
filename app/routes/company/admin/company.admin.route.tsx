import type { Route } from './+types/company.admin.route';
import { AdminCompanyController } from '~/api/generated/base';
import { Card, CardContent } from '~/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Contact,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Calendar,
  Layers,
  BarChart3,
  UserCheck,
  UserX,
  Key,
  MailCheck,
} from 'lucide-react';

export async function loader({ request: _request }: Route.LoaderArgs) {
  try {
    const metrics = await AdminCompanyController.getDashboardMetrics();
    if (!metrics.data) {
      throw Error('Det sjekke en feil, kontakt support');
    }

    return {
      metrics: metrics.data.data,
    };
  } catch (error: any) {
    console.error(JSON.stringify(error, null, 2));
    if (error as unknown as { body?: { message?: string } }) {
      return { error: error.body.message };
    }

    throw error;
  }
}

export default function CompanyAdminRoute({ loaderData }: Route.ComponentProps) {
  const { metrics } = loaderData;

  if (!metrics) {
    return <></>;
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Hero Stats - 3 Cards Only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totalt Brukere</p>
                <p className="text-3xl font-bold text-foreground mt-2">{metrics.overview.totalUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktive Siste 30 Dager</p>
                <p className="text-3xl font-bold text-foreground mt-2">{metrics.users.activeLastThirtyDays}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totalt Kontakter</p>
                <p className="text-3xl font-bold text-foreground mt-2">{metrics.contacts.totalContacts}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Contact className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Sections */}
      <Accordion type="multiple" className="space-y-4">
        {/* User Analytics Section */}
        <AccordionItem value="analytics" className="border-0 bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger className="px-6 py-4 hover:bg-accordion-trigger-hover-bg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-accordion-trigger-text">Brukeranalyse</h3>
                  <p className="text-sm text-accordion-trigger-text-muted">Detaljert brukerstatistikk og aktivitet</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 bg-accordion-content-bg">
              <div className="space-y-6 pt-4">
                {/* User Metrics */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-accordion-content-text">Brukerstatistikk</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricBox
                      label="Aktive Brukere"
                      value={metrics.users.totalActive}
                      icon={<UserCheck className="h-4 w-4" />}
                      variant="success"
                    />
                    <MetricBox
                      label="Nye Denne Måneden"
                      value={metrics.users.newThisMonth}
                      icon={<UserPlus className="h-4 w-4" />}
                      variant="info"
                    />
                    <MetricBox
                      label="Inaktive Brukere"
                      value={metrics.users.inactiveUsers}
                      icon={<UserX className="h-4 w-4" />}
                      variant="warning"
                    />
                    <MetricBox
                      label="Gj.snitt Kontoalder"
                      value={`${metrics.users.averageAccountAgeDays}d`}
                      icon={<Calendar className="h-4 w-4" />}
                      variant="neutral"
                    />
                  </div>
                </div>

                {/* Role Distribution */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-secondary" />
                    </div>
                    <h4 className="font-semibold text-accordion-content-text">Rollefordeling</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(metrics.overview.roleDistribution).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{role}</span>
                        </div>
                        <span className="text-xl font-bold text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invitation Metrics */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-chart-3" />
                    </div>
                    <h4 className="font-semibold text-accordion-content-text">Invitasjonsstatistikk</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <MetricBox
                      label="Ventende"
                      value={metrics.invitations.pending}
                      icon={<Clock className="h-4 w-4" />}
                      variant="warning"
                    />
                    <MetricBox
                      label="Utløpt"
                      value={metrics.invitations.expired}
                      icon={<XCircle className="h-4 w-4" />}
                      variant="error"
                    />
                    <MetricBox
                      label="Totalt Sendt"
                      value={metrics.invitations.totalSent}
                      icon={<MailCheck className="h-4 w-4" />}
                      variant="info"
                    />
                    <MetricBox
                      label="Brukt"
                      value={metrics.invitations.totalUsed}
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      variant="success"
                    />
                    <MetricBox
                      label="Akseptanserate"
                      value={`${metrics.invitations.acceptanceRate}%`}
                      icon={<TrendingUp className="h-4 w-4" />}
                      variant="success"
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Security & Products Section */}
        <AccordionItem value="security" className="border-0 bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger className="px-6 py-4 hover:bg-accordion-trigger-hover-bg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-accordion-trigger-text">Sikkerhet & Produkter</h3>
                  <p className="text-sm text-accordion-trigger-text-muted">
                    Sikkerhetsmetrikker og aktiverte tjenester
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 bg-accordion-content-bg">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Security Metrics */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-accordion-content-text flex items-center gap-2">
                    <Shield className="h-4 w-4 text-destructive" />
                    Sikkerhet
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Passord Tilbakestillinger</span>
                      </div>
                      <span className="text-lg font-bold">{metrics.security.passwordResetsLastThirtyDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Aktive Økter</span>
                      </div>
                      <span className="text-lg font-bold">{metrics.security.activeSessions}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Tilbakekalte Tokens</span>
                      </div>
                      <span className="text-lg font-bold">{metrics.security.revokedTokensLastThirtyDays}</span>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-accordion-content-text flex items-center gap-2">
                    <Layers className="h-4 w-4 text-secondary" />
                    Aktiverte Produkter
                  </h4>
                  <div className="space-y-2">
                    {metrics.overview.enabledProducts.map((product) => (
                      <div
                        key={product}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20"
                      >
                        <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                        <span className="font-medium text-foreground">{getProductName(product)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contacts */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-accordion-content-text flex items-center gap-2">
                    <Contact className="h-4 w-4 text-chart-5" />
                    Kontakter
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-accordion-content-text-muted">Totalt</span>
                      <span className="text-2xl font-bold text-accordion-content-text">
                        {metrics.contacts.totalContacts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-accordion-content-text-muted">Komplett Info</span>
                      <span className="text-lg font-semibold text-secondary">
                        {metrics.contacts.contactsWithCompleteInfo}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all duration-500"
                        style={{
                          width: `${(metrics.contacts.contactsWithCompleteInfo / metrics.contacts.totalContacts) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Recent Activity Section */}
        <AccordionItem value="activity" className="border-0 bg-accordion-bg">
          <Card variant="bordered">
            <AccordionTrigger className="px-6 py-4 hover:bg-accordion-trigger-hover-bg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-chart-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-accordion-trigger-text">Nylig Aktivitet</h3>
                  <p className="text-sm text-accordion-trigger-text-muted">Siste brukere, invitasjoner og kontakter</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 bg-accordion-content-bg">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Recent Users */}
                <div>
                  <h4 className="font-semibold text-accordion-content-text mb-4">Siste Aktive Brukere</h4>
                  <div className="space-y-3">
                    {metrics.users.lastActiveUsers.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {user.givenName[0]}
                            {user.familyName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-accordion-content-text truncate">
                            {user.givenName} {user.familyName}
                          </p>
                          <p className="text-xs text-accordion-content-text-muted truncate">{user.email}</p>
                        </div>
                        <span className="text-xs text-accordion-content-text-muted whitespace-nowrap">
                          {formatRelativeTime(user.lastActiveAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Invitations */}
                <div>
                  <h4 className="font-semibold text-accordion-content-text mb-4">Siste Invitasjoner</h4>
                  <div className="space-y-3">
                    {metrics.invitations.recentInvites.map((invite, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-chart-3/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 text-chart-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-accordion-content-text truncate">{invite.email}</p>
                          <p className="text-xs text-accordion-content-text-muted">
                            Sendt {formatRelativeTime(invite.sentAt)}
                          </p>
                        </div>
                        {invite.used ? (
                          <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Contacts */}
                <div>
                  <h4 className="font-semibold text-accordion-content-text mb-4">Nye Kontakter</h4>
                  <div className="space-y-3">
                    {metrics.contacts.recentContacts.map((contact) => (
                      <div
                        key={contact.contactId}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-chart-5/10 flex items-center justify-center flex-shrink-0">
                          <Contact className="h-4 w-4 text-chart-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-accordion-content-text truncate">
                            {contact.givenName} {contact.familyName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {contact.hasEmail && <Mail className="h-3 w-3 text-secondary" />}
                            {contact.hasMobile && <Activity className="h-3 w-3 text-secondary" />}
                          </div>
                        </div>
                        <span className="text-xs text-accordion-content-text-muted whitespace-nowrap">
                          {formatRelativeTime(contact.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Account Info Footer */}
      <Card variant="ghost">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Konto opprettet: {new Date(metrics.overview.accountCreatedAt).toLocaleDateString('nb-NO')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// UTILITY COMPONENTS
// ============================================

type MetricBoxProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant: 'success' | 'error' | 'warning' | 'info' | 'neutral';
};

function MetricBox({ label, value, icon, variant }: MetricBoxProps) {
  const variantStyles = {
    success: 'bg-secondary/10 text-secondary',
    error: 'bg-destructive/10 text-destructive',
    warning: 'bg-chart-3/10 text-chart-3',
    info: 'bg-primary/10 text-primary',
    neutral: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
      <div className={`inline-flex items-center justify-center h-8 w-8 rounded ${variantStyles[variant]}`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getProductName(product: string): string {
  const names: Record<string, string> = {
    BOOKING: 'Bestilling',
    EVENT: 'Arrangementer',
    TIMESHEET: 'Timeliste',
  };
  return names[product] || product;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMinutes < 1) return 'Nå';
  if (diffInMinutes < 60) return `${diffInMinutes}m siden`;
  if (diffInHours < 24) return `${diffInHours}t siden`;
  if (diffInDays < 7) return `${diffInDays}d siden`;
  return date.toLocaleDateString('nb-NO');
}
