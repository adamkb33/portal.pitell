import { data } from 'react-router';
import type { Route } from './+types/booking.public.my-appointments.loyalty.route';
import { ArrowLeft, CalendarPlus, CalendarX, Gift, PartyPopper, Repeat, Sparkles, type LucideIcon } from 'lucide-react';
import { AppointmentsController, type LoyaltyCardDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { formatCompanyName } from '~/routes/booking/public/_utils/booking-company-name';
import { cn, Container, Notice, Stack } from '~/ui';
import { LoyaltyProgress } from '../_components/loyalty-progress';
import { buildNewBookingHref, describeLoyaltyProgress } from '../_utils/my-appointments.utils';

const OVERVIEW_HREF = ROUTES_MAP['booking.public.my-appointments'].href;

export async function loader({ request, params }: Route.LoaderArgs) {
  await authService.requireAuth(request, ROUTES_MAP['auth.sign-in'].href);
  const companyId = Number(params.companyId);

  try {
    const response = await withAuth(request, () => AppointmentsController.getMyLoyaltyCards());
    const card = (response.data?.data ?? []).find((item) => item.companyId === companyId) ?? null;
    return data(
      { card, error: card ? null : ('Fant ikke lojalitetskortet.' as string | null) },
      { status: card ? 200 : 404 },
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente lojalitetskortet.');
    return data({ card: null as LoyaltyCardDto | null, error: message }, { status: status ?? 400 });
  }
}

export default function BookingPublicMyAppointmentsLoyaltyRoute({ loaderData }: Route.ComponentProps) {
  const { card, error } = loaderData;
  const bookHref = buildNewBookingHref(card?.companyId);
  const rawCompanyName = card?.companyName?.trim();
  const companyName = rawCompanyName ? formatCompanyName(rawCompanyName) : null;

  return (
    <Container gutter="none">
      <Stack space="md">
        <BookingLink
          to={OVERVIEW_HREF}
          variant="inline"
          className="min-h-11 gap-2 self-start text-booking-action-text hover:text-booking-action-text"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Mine bookinger
        </BookingLink>

        {error && <Notice variant="booking" tone="emphasis" title="Kunne ikke vise kortet" message={error} />}

        {card && (
          <>
            <header>
              {companyName && <p className="text-sm text-booking-text-muted">Lojalitetskort</p>}
              <h1 className="text-2xl font-bold tracking-tight text-booking-text">{companyName ?? 'Lojalitetskort'}</h1>
            </header>

            {/* When the next visit is free the card itself turns to the highlight colour, so no extra banner. */}
            <section
              className={cn(
                'flex flex-col gap-4 rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] p-4',
                card.nextVisitIsFree
                  ? 'border-booking-highlight bg-booking-highlight-muted'
                  : 'border-booking-border bg-booking-surface-raised',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    card.nextVisitIsFree
                      ? 'bg-booking-highlight text-booking-highlight-contrast'
                      : 'bg-booking-action-muted text-booking-action-text',
                  )}
                  aria-hidden
                >
                  {card.nextVisitIsFree ? <PartyPopper className="size-6" /> : <Gift className="size-6" />}
                </span>
                <h2 className="text-lg font-bold leading-tight text-booking-text">{describeLoyaltyProgress(card)}</h2>
              </div>
              <LoyaltyProgress card={card} />
            </section>

            <ul className="flex flex-col gap-2.5" role="list">
              {card.visitsRequired > 1 && (
                <LoyaltyRule icon={Repeat}>Hvert {card.visitsRequired}. besøk er gratis</LoyaltyRule>
              )}
              <LoyaltyRule icon={Sparkles}>Gratis besøk trekkes automatisk</LoyaltyRule>
              <LoyaltyRule icon={CalendarX}>Avbestilte timer og uteblivelser teller ikke</LoyaltyRule>
            </ul>

            {bookHref && (
              <BookingLink to={bookHref} fullWidth>
                <CalendarPlus className="size-4" aria-hidden />
                Book time
              </BookingLink>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}

function LoyaltyRule({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-sm text-booking-text-muted">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-booking-action-muted text-booking-text"
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      {children}
    </li>
  );
}
