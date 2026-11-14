import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Mail, Search, SearchX, Users, X } from 'lucide-react';
import { AdminCompanyUserController, type CompanyUserDto, type InviteTokenDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { COMPANY_ROLE_LABELS } from '~/lib/constants';
import type { CreateActionHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { Badge, Button, CompanyPageTemplate, Input, ListEmpty, ListStrip, PageNotice, categoryTone, cn } from '~/ui';
import type { Route } from './+types/company.admin.employees.route';

export const handle = {
  createAction: { label: 'Inviter ansatt', to: ROUTES_MAP['company.admin.employees.invite'].href },
} satisfies CreateActionHandle;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // A salon has a handful of people, so load them all and search on the page.
    const [usersResponse, invitesResponse] = await withAuth(request, () =>
      Promise.all([
        AdminCompanyUserController.getCompanyUsers({ query: { page: 0, size: 1000, includeDeleted: false } }),
        AdminCompanyUserController.getInvitations(),
      ]),
    );
    return {
      users: usersResponse.data?.data?.content ?? [],
      invites: invitesResponse.data?.data ?? [],
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente ansatte');
    return { users: [] as CompanyUserDto[], invites: [] as InviteTokenDto[], error: message };
  }
}

/**
 * Ansatte (Liste, approved sketch 2026-11-14): one list card with search, pending invitations first, then the
 * employees. A row opens the person; "Inviter ansatt" is the page's create action.
 */
export default function CompanyAdminEmployees({ loaderData }: Route.ComponentProps) {
  const { users, invites, error } = loaderData;
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const shownUsers = useMemo(
    () => (query ? users.filter((user) => `${fullName(user)} ${user.email}`.toLowerCase().includes(query)) : users),
    [users, query],
  );
  const shownInvites = useMemo(
    () => (query ? invites.filter((invite) => invite.email.toLowerCase().includes(query)) : invites),
    [invites, query],
  );

  if (error) {
    return (
      <CompanyPageTemplate title="Ansatte">
        <PageNotice title="Kunne ikke hente ansatte" />
      </CompanyPageTemplate>
    );
  }

  const nothingShown = shownUsers.length === 0 && shownInvites.length === 0;

  return (
    <CompanyPageTemplate title="Ansatte">
      <section aria-label="Ansatte" className="max-w-190 overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-3 p-3 sm:p-5">
          <div className="relative flex-1">
            <Input
              aria-label="Søk etter navn eller e-post"
              placeholder="Søk etter navn eller e-post"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              startIcon={<Search />}
              className="h-11 pr-11 text-base sm:h-10"
            />
            {search ? (
              <button
                type="button"
                aria-label="Tøm søk"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive sm:size-8"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <PageCreateButton className="ml-0" />
        </div>

        {shownInvites.length > 0 ? (
          <section aria-labelledby="employees-invites">
            <ListStrip
              id="employees-invites"
              label="Venter på svar"
              count={`${shownInvites.length} ${shownInvites.length === 1 ? 'invitasjon' : 'invitasjoner'}`}
            />
            <ul className="divide-y divide-border">
              {shownInvites.map((invite) => (
                <li key={invite.id}>
                  <InviteRow invite={invite} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {shownUsers.length > 0 ? (
          <section aria-labelledby="employees-users">
            <ListStrip
              id="employees-users"
              label="Ansatte"
              count={`${shownUsers.length} ${shownUsers.length === 1 ? 'ansatt' : 'ansatte'}`}
            />
            <ul className="divide-y divide-border">
              {shownUsers.map((user) => (
                <li key={user.userId}>
                  <EmployeeRow user={user} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {nothingShown ? (
          query ? (
            <ListEmpty
              icon={SearchX}
              title={`Ingen treff på «${search.trim()}»`}
              action={
                <Button variant="outline" onClick={() => setSearch('')}>
                  Tøm søk
                </Button>
              }
            />
          ) : (
            <ListEmpty icon={Users} title="Ingen ansatte ennå" />
          )
        ) : (
          <p className="border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
            {shownUsers.length} {shownUsers.length === 1 ? 'ansatt' : 'ansatte'}
          </p>
        )}
      </section>
    </CompanyPageTemplate>
  );
}

/** One employee: initials in their colour, name, role and email; the whole row opens the person. */
function EmployeeRow({ user }: { user: CompanyUserDto }) {
  const tone = categoryTone(user.userId);
  return (
    <Link
      to={`${ROUTES_MAP['company.admin.employees.edit'].href}?userId=${user.userId}`}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span
        aria-hidden
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold',
          tone.tint,
          tone.ink,
        )}
      >
        {initials(user)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{fullName(user) || user.email}</span>
        <span className="block truncate text-sm text-text-secondary">
          {[formatRoles(user.companyRoles), user.email].filter(Boolean).join(' · ')}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

/** A pending invitation: the e-mail, the role it gives, and "Venter"; the whole row opens the invitation. */
function InviteRow({ invite }: { invite: InviteTokenDto }) {
  return (
    <Link
      to={`${ROUTES_MAP['company.admin.employees.invitation'].href}?id=${invite.id}`}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-variant-1 text-text-secondary"
      >
        <Mail className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{invite.email}</span>
        <span className="block truncate text-sm text-text-secondary">{formatRoles(invite.payload.companyRoles)}</span>
      </span>
      <Badge variant="warning" size="sm">
        Venter
      </Badge>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

const fullName = (user: CompanyUserDto) => [user.givenName, user.familyName].filter(Boolean).join(' ');

const initials = (user: CompanyUserDto) =>
  [user.givenName, user.familyName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) ||
  user.email[0]?.toUpperCase() ||
  '?';

const formatRoles = (roles: Array<'ADMIN' | 'EMPLOYEE'>) => roles.map((role) => COMPANY_ROLE_LABELS[role]).join(', ');
