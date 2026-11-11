import { Link } from 'react-router';
import { Clock, Scissors, UserRound } from 'lucide-react';
import type { Route } from './+types/company.booking.profile.route';
import { CompanyUserBookingProfileController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, ListEmpty, ListRow, Notice, categoryTone, cn } from '~/ui';
import { BOOKING_AREAS } from '../_utils/booking-areas';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const response = await withAuth(request, () => CompanyUserBookingProfileController.getBookingProfile());
    return { bookingProfile: response.data?.id ? response.data : null, error: null };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente bookingprofil');
    return { bookingProfile: null, error: message };
  }
}

export default function BookingCompanyUserProfile({ loaderData }: Route.ComponentProps) {
  const { bookingProfile, error } = loaderData;
  const profileName = [bookingProfile?.familyName, bookingProfile?.givenName].filter(Boolean).join(' ');
  const initials = [bookingProfile?.familyName, bookingProfile?.givenName]
    .map((name) => name?.charAt(0) ?? '')
    .join('');
  const tone = categoryTone(BOOKING_AREAS.find((area) => area.key === 'profile')!.tone);
  const services = bookingProfile?.services ?? [];
  const serviceCount = services.reduce((total, group) => total + group.services.length, 0);
  const dayCount = new Set(bookingProfile?.dailySchedule?.map((day) => day.dayOfWeek) ?? []).size;

  return (
    <CompanyPageTemplate title="Bookingprofil">
      {error ? (
        <Notice tone="emphasis" title="Kunne ikke hente bookingprofil" message={error} />
      ) : !bookingProfile ? (
        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <ListEmpty
            icon={UserRound}
            title="Ingen bookingprofil"
            action={
              <Button asChild>
                <Link to={ROUTES_MAP['company.booking.profile.create'].href}>Opprett bookingprofil</Link>
              </Button>
            }
          />
        </section>
      ) : (
        <>
          <section
            aria-label="Bookingprofil"
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 sm:items-center sm:gap-4 sm:p-6"
          >
            {bookingProfile.image?.url ? (
              <img src={bookingProfile.image.url} alt="" className="size-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                className={cn(
                  'flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold',
                  tone.tint,
                  tone.ink,
                )}
                aria-hidden
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{profileName}</h2>
              {bookingProfile.description?.trim() ? (
                <p className="mt-1 text-sm text-text-secondary">{bookingProfile.description}</p>
              ) : null}
            </div>
          </section>
          <section
            aria-label="Rediger bookingprofil"
            className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background"
          >
            {[
              { title: 'Profil', line: 'Beskrivelse og bilde', section: 'edit', icon: UserRound },
              {
                title: 'Tjenester',
                line: `${serviceCount} ${serviceCount === 1 ? 'tjeneste' : 'tjenester'} · ${services.length} ${services.length === 1 ? 'gruppe' : 'grupper'}`,
                section: 'services',
                icon: Scissors,
              },
              {
                title: 'Arbeidstider',
                line: `${dayCount} ${dayCount === 1 ? 'arbeidsdag' : 'arbeidsdager'}`,
                section: 'work-hours',
                icon: Clock,
              },
            ].map(({ title, line, section, icon: Icon }) => (
              <ListRow
                key={section}
                to={ROUTES_MAP[`company.booking.profile.${section}`].href}
                title={title}
                line={line}
                lead={
                  <span
                    className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone.tint, tone.ink)}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                }
                trailing={<span className="rounded-full border border-border px-2.5 py-1 text-xs">Endre</span>}
              />
            ))}
          </section>
        </>
      )}
    </CompanyPageTemplate>
  );
}
