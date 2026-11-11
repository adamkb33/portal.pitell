import { Form, Link, data, useNavigation } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { ProviderButtons } from '~/routes/auth/_components/provider-buttons';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import { BookingStepTemplate, Input, Label } from '~/ui';
import { BOOKING_CONTACT_LABEL_CLASS } from '../_utils/booking-contact-theme';
import { clearManualContactOverride } from '../_utils/manual-contact-override.cookie.server';
import type { Route } from './+types/booking.public.appointment.session.contact.sign-in.route';

const SIGN_IN_FORM_ID = 'booking-sign-in-form';

// Choosing to sign in drops the "fill in by hand" choice, so the contact step picks up the account afterwards.
export async function loader(_args: Route.LoaderArgs) {
  return data(null, { headers: { 'Set-Cookie': await clearManualContactOverride() } });
}

/** Sign-in inside the booking flow. It posts to the real sign-in action, which returns the customer to contact. */
export default function BookingContactSignInPage() {
  const routes = getBookingRouteMap();
  const companyName = useBookingCompanyName();
  const navigation = useNavigation();
  const isBusy = navigation.state !== 'idle';
  const isSigningIn = isBusy && navigation.formAction === ROUTES_MAP['auth.sign-in'].href;
  const isGoingBack = isBusy && !navigation.formAction && navigation.location?.pathname === routes.contact;

  return (
    <BookingStepTemplate label={companyName} title="Logg inn">
      <Form
        id={SIGN_IN_FORM_ID}
        method="post"
        action={ROUTES_MAP['auth.sign-in'].href}
        className="space-y-4 rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised p-4 shadow-[var(--shadow-booking-card)]"
      >
        <input type="hidden" name="returnTo" value={routes.contact} />
        <input type="hidden" name="retryTo" value={routes.contactSignIn} />

        <div className="space-y-2">
          <Label htmlFor="emailOrMobile" className={BOOKING_CONTACT_LABEL_CLASS}>
            E-post eller mobilnummer
          </Label>
          <Input id="emailOrMobile" name="emailOrMobile" variant="booking" autoComplete="username" disabled={isBusy} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={BOOKING_CONTACT_LABEL_CLASS}>
            Passord
          </Label>
          <Input
            id="password"
            name="password"
            variant="booking"
            type="password"
            autoComplete="current-password"
            disabled={isBusy}
          />
          <Link
            to={ROUTES_MAP['auth.forgot-password'].href}
            className="inline-block text-sm font-semibold text-booking-action-text hover:underline"
          >
            Glemt passord?
          </Link>
        </div>

        <ProviderButtons disabled={isBusy} showDivider={false} className="border-t border-booking-border pt-4" />
      </Form>

      <BookingFooterNav>
        <BookingLink to={routes.contact} variant="secondary" loading={isGoingBack} disabled={isBusy}>
          Tilbake
        </BookingLink>
        <BookingActionButton
          type="submit"
          form={SIGN_IN_FORM_ID}
          variant="primary"
          loading={isSigningIn}
          disabled={isBusy}
        >
          {isSigningIn ? 'Logger inn ...' : 'Logg inn'}
        </BookingActionButton>
      </BookingFooterNav>
    </BookingStepTemplate>
  );
}
