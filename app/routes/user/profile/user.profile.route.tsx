import type { ComponentType, ReactNode } from 'react';
import { Link, data } from 'react-router';
import { Check, Lock, Mail, Smartphone } from 'lucide-react';
import { AuthController } from '~/api/generated';
import type { UserDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { authService } from '~/lib/auth-service';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyPageTemplate, ListStrip, cn } from '~/ui';
import type { Route } from './+types/user.profile.route';

export async function loader({ request }: Route.LoaderArgs) {
  await authService.requireAuth(request);
  const session = await authService.getUserSession(request);
  const fallbackUser: UserDto = {
    id: session.user.id,
    email: session.user.email,
    emailVerified: false,
    mobileVerified: false,
    hasPassword: true,
    accountStatus: 'FULL',
  };

  const userContextResponse = await withAuth(
    request,
    async () => AuthController.getUserContext(),
    session.accessToken,
  ).catch(() => null);
  const user = userContextResponse?.data?.data?.user ?? fallbackUser;

  return data({ user });
}

/**
 * Min profil (page type Oversikt, approved sketch 2026-11-12): who you are, how we reach you, and your password.
 * Name, e-mail and mobile are read-only (no endpoint changes them); the password opens its own form page.
 */
export default function Profile({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const name = [user.givenName, user.familyName].filter(Boolean).join(' ').trim();
  const initials = (name || user.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <CompanyPageTemplate title="Min profil">
      <section
        aria-label="Min profil"
        className="w-full max-w-[35rem] overflow-hidden rounded-xl border border-border bg-background"
      >
        <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-900"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-text-primary">{name || user.email}</h2>
            {name && user.email ? <p className="truncate text-sm text-text-secondary">{user.email}</p> : null}
          </div>
        </div>

        {user.email || user.mobileNumber ? (
          <>
            <ListStrip label="Kontakt" />
            <ul className="divide-y divide-border">
              {user.email ? (
                <li>
                  <InfoRow
                    icon={Mail}
                    label="E-post"
                    value={user.email}
                    trailing={<Verified verified={user.emailVerified} />}
                  />
                </li>
              ) : null}
              {user.mobileNumber ? (
                <li>
                  <InfoRow
                    icon={Smartphone}
                    label="Mobil"
                    value={user.mobileNumber}
                    trailing={<Verified verified={user.mobileVerified} />}
                  />
                </li>
              ) : null}
            </ul>
          </>
        ) : null}

        {user.hasPassword ? (
          <>
            <ListStrip label="Sikkerhet" />
            <InfoRow
              icon={Lock}
              label="Passord"
              value="••••••••"
              to={ROUTES_MAP['user.profile.password'].href}
              trailing={
                <span className="rounded-full bg-interactive/10 px-3.5 py-1.5 text-sm font-semibold text-interactive">
                  Endre
                </span>
              }
            />
          </>
        ) : null}
      </section>
    </CompanyPageTemplate>
  );
}

/** A tile, the label above its value, and something at the end. With `to`, the whole row opens that page. */
function InfoRow({
  icon: Icon,
  label,
  value,
  trailing,
  to,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  trailing?: ReactNode;
  to?: string;
}) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-blue-50 text-interactive">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-text-secondary">{label}</span>
        <span className="block truncate font-semibold text-text-primary">{value}</span>
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </>
  );
  const base = 'flex min-h-15 items-center gap-3 px-4 py-2.5 sm:px-5';
  return to ? (
    <Link
      to={to}
      aria-label={`Endre ${label.toLowerCase()}`}
      className={cn(
        base,
        'transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

function Verified({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-flash-success-bg px-2 py-0.5 text-xs font-semibold text-flash-success-text">
      <Check className="size-3" aria-hidden />
      Bekreftet
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
      Ikke bekreftet
    </span>
  );
}
