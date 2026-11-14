import { Link, data } from 'react-router';
import { ChevronRight, Mail, UserX } from 'lucide-react';
import type { Route } from './+types/company.admin.statistics.route';
import {
  AdminCompanyController,
  type CompanyDashboardMetrics,
  type RecentInvite,
  type RecentUser,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { formatOslo } from '~/lib/oslo-time';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { StatRow } from '~/routes/company/booking/statistics/_components/statistics-parts';
import { Badge, CompanyPageTemplate, ListStrip, PageNotice, categoryTone, cn } from '~/ui';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const response = await withAuth(request, () => AdminCompanyController.getDashboardMetrics());
    return data({ metrics: response.data?.data ?? null, now: new Date().toISOString() });
  } catch (error) {
    resolveErrorPayload(error, 'Kunne ikke hente statistikk');
    return data({ metrics: null, now: new Date().toISOString() });
  }
}

/**
 * Administrasjon → Statistikk (approved sketch 2026-11-14): only numbers an owner can act on. Tilgang: who has access,
 * and who to follow up (not signed in for 30 days, expired invitations). Kontakter: how many can be reached by SMS or
 * e-mail. Nothing that is 0 or empty is shown (ui-rules, rule 1): a card with nothing left goes.
 */
export default function CompanyAdminStatisticsRoute({ loaderData }: Route.ComponentProps) {
  const { metrics, now } = loaderData;

  if (!metrics) {
    return (
      <CompanyPageTemplate title="Statistikk">
        <PageNotice title="Kunne ikke hente statistikk" />
      </CompanyPageTemplate>
    );
  }

  return (
    <CompanyPageTemplate title="Statistikk">
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
        <AccessCard metrics={metrics} />
        <ContactsCard metrics={metrics} now={now} />
      </div>
    </CompanyPageTemplate>
  );
}

function AccessCard({ metrics }: { metrics: CompanyDashboardMetrics }) {
  const { inactiveUsers } = metrics.users;
  const { expiredInvites } = metrics.invitations;
  const admins = metrics.overview.roleDistribution.ADMIN ?? 0;
  const employees = metrics.overview.roleDistribution.EMPLOYEE ?? 0;
  const roles = [
    admins > 0 ? `${admins} ${admins === 1 ? 'administrator' : 'administratorer'}` : null,
    employees > 0 ? `${employees} ${employees === 1 ? 'ansatt' : 'ansatte'}` : null,
  ].filter((line): line is string => Boolean(line));
  const followUps = inactiveUsers.length + expiredInvites.length;

  return (
    <Card title="Tilgang" id="stats-access">
      <dl
        className={cn(
          'grid grid-cols-1 [&>div]:border-t [&>div]:border-border',
          // Side by side only when there are two and the card is wide enough for both.
          inactiveUsers.length > 0 && 'xl:grid-cols-2 xl:[&>div:nth-child(2)]:border-l',
        )}
      >
        <StatRow
          label="Har tilgang"
          value={metrics.users.totalActive}
          compare={roles.length > 0 ? <Lines lines={roles} /> : undefined}
        />
        {inactiveUsers.length > 0 ? <StatRow label="Ikke logget inn på 30 dager" value={inactiveUsers.length} /> : null}
      </dl>
      {followUps > 0 ? (
        <section aria-labelledby="stats-follow-up">
          <ListStrip id="stats-follow-up" label="Følg opp" count={followUps} />
          <ul className="divide-y divide-border">
            {inactiveUsers.map((user) => (
              <li key={user.userId}>
                <InactiveUserRow user={user} />
              </li>
            ))}
            {expiredInvites.map((invite) => (
              <li key={invite.email}>
                <ExpiredInviteRow invite={invite} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}

function ContactsCard({ metrics, now }: { metrics: CompanyDashboardMetrics; now: string }) {
  const contacts = metrics.contacts;
  if (contacts.totalContacts === 0) return null;

  // Calendar months in Oslo, as the backend counts them.
  const monthIndex = Number(formatOslo(now, { month: 'numeric' })) - 1;
  const thisMonth = MONTHS[monthIndex];
  const lastMonth = MONTHS[(monthIndex + 11) % 12];
  const diff = contacts.newThisMonth - contacts.newLastMonth;
  const newLines = [
    contacts.newThisMonth > 0 ? `${contacts.newThisMonth} nye i ${thisMonth}` : null,
    contacts.newThisMonth > 0 && contacts.newLastMonth > 0 && diff !== 0
      ? `${Math.abs(diff)} ${diff > 0 ? 'flere' : 'færre'} enn i ${lastMonth}`
      : null,
  ].filter((line): line is string => Boolean(line));
  const percent = (part: number) => `${Math.round((part / contacts.totalContacts) * 100)} %`;

  return (
    <Card title="Kontakter" id="stats-contacts">
      <dl
        className={cn(
          'grid grid-cols-1 [&>div]:border-t [&>div]:border-border',
          contacts.withMobile > 0 &&
            contacts.withEmail > 0 &&
            'xl:grid-cols-2 xl:[&>div:first-child]:col-span-2 xl:[&>div:nth-child(3)]:border-l',
        )}
      >
        <StatRow
          label="Kontakter"
          value={contacts.totalContacts.toLocaleString('nb-NO')}
          compare={newLines.length > 0 ? <Lines lines={newLines} /> : undefined}
        />
        {contacts.withMobile > 0 ? (
          <StatRow
            label="Kan få SMS"
            value={contacts.withMobile.toLocaleString('nb-NO')}
            compare={percent(contacts.withMobile)}
          />
        ) : null}
        {contacts.withEmail > 0 ? (
          <StatRow
            label="Kan få e-post"
            value={contacts.withEmail.toLocaleString('nb-NO')}
            compare={percent(contacts.withEmail)}
          />
        ) : null}
      </dl>
      {contacts.withNeither > 0 ? (
        <Link to={`${ROUTES_MAP['company.admin.contacts'].href}?vis=uten-kontaktinfo`} className={rowClass}>
          <Tile>
            <UserX className="size-5" strokeWidth={1.8} />
          </Tile>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-text-primary">
              {contacts.withNeither} uten mobil og e-post
            </span>
            <span className="block truncate text-sm text-text-secondary">Kan ikke få påminnelser eller tilbud</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
        </Link>
      ) : null}
    </Card>
  );
}

/** Someone with access who hasn't signed in for 30 days: opens the person, where access can be removed. */
function InactiveUserRow({ user }: { user: RecentUser }) {
  const tone = categoryTone(user.userId);
  const name = [user.givenName, user.familyName].filter(Boolean).join(' ') || user.email;
  const initials =
    [user.givenName, user.familyName]
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || user.email[0]?.toUpperCase();

  return (
    <Link to={`${ROUTES_MAP['company.admin.employees.edit'].href}?userId=${user.userId}`} className={rowClass}>
      <span
        aria-hidden
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold',
          tone.tint,
          tone.ink,
        )}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{name}</span>
        <span className="block truncate text-sm text-text-secondary">
          {user.lastActiveAt ? `Sist innlogget ${shortDate(user.lastActiveAt)}` : 'Aldri logget inn'}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

/** An invitation nobody used before it ran out: opens Inviter ansatt with the e-mail filled in. */
function ExpiredInviteRow({ invite }: { invite: RecentInvite }) {
  return (
    <Link
      to={`${ROUTES_MAP['company.admin.employees.invite'].href}?${new URLSearchParams({ email: invite.email })}`}
      className={rowClass}
    >
      <Tile>
        <Mail className="size-5" strokeWidth={1.8} />
      </Tile>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{invite.email}</span>
        <span className="block truncate text-sm text-text-secondary">Gikk ut {shortDate(invite.expiresAt)}</span>
      </span>
      <Badge variant="warning" size="sm">
        Utløpt
      </Badge>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

/** Short facts on their own lines, so a long one never squeezes the label. */
function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <span key={line} className="block whitespace-nowrap">
          {line}
        </span>
      ))}
    </>
  );
}

function Card({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-xl border border-border bg-background">
      <h2 id={id} className="px-4 py-3 font-display text-base font-semibold text-text-primary sm:px-5">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-variant-1 text-text-secondary"
    >
      {children}
    </span>
  );
}

const rowClass =
  'flex h-15 items-center gap-3 border-t border-border px-4 transition-colors first:border-t-0 hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5';

const MONTHS = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

/** "12. sep." in Oslo time. */
const shortDate = (value: string) => formatOslo(value, { day: 'numeric', month: 'short' });
