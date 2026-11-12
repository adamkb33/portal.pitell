import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '~/ui';
import { VerificationCodeInput } from '~/ui';

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = process.cwd();

function readSessionRoute(relativePath: string) {
  return readFileSync(join(currentDir, relativePath), 'utf8');
}

function readWorkspaceFile(relativePath: string) {
  return readFileSync(join(workspaceRoot, relativePath), 'utf8');
}

describe('booking pending submission UI', () => {
  it('shared Button disables native submit controls when loading is true', () => {
    const markup = renderToStaticMarkup(
      React.createElement(Button, { type: 'submit', loading: true }, 'Submit booking'),
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
  });

  it('verification code input disables its hidden input and visual boxes', () => {
    const markup = renderToStaticMarkup(
      React.createElement(VerificationCodeInput, {
        name: 'code',
        value: '123456',
        onChange: () => undefined,
        disabled: true,
      }),
    );

    expect(markup).toContain('name="code"');
    expect(markup).toContain('disabled=""');
  });

  it('disables contact landing submissions through submission and redirect loading', () => {
    const source = readSessionRoute('contact/booking.public.appointment.session.contact.route.tsx');

    expect(source).toContain('useNavigation');
    expect(source).toContain("navigation.state !== 'idle'");
    expect(source).toContain("loading={pendingIntent === 'identify'}");
    expect(source).toContain('disabled={isSubmitting}');
    expect(source).not.toContain("contactState: 'CONTINUE_AS'");
    expect(source).not.toContain("contactState: 'RESUME'");
    expect(source).not.toContain('ProviderButtons');
  });

  it('booking sign-in posts to the real sign-in action and comes back to the contact step', () => {
    const signInSource = readSessionRoute(
      'contact/sign-in/booking.public.appointment.session.contact.sign-in.route.tsx',
    );

    expect(signInSource).toContain("action={ROUTES_MAP['auth.sign-in'].href}");
    expect(signInSource).toContain('name="returnTo" value={routes.contact}');
    expect(signInSource).toContain('name="retryTo" value={routes.contactSignIn}');
    expect(signInSource).toContain("'Set-Cookie': await clearManualContactOverride()");
  });

  it('disables SMS verification submissions while requests are pending', () => {
    const verifyMobileSource = readSessionRoute(
      'contact/verify-mobile/booking.public.appointment.session.contact.verify-mobile.route.tsx',
    );

    expect(verifyMobileSource).toContain("const isSubmitting = navigation.state !== 'idle'");
    expect(verifyMobileSource).toContain("const isSendingCode = isSubmitting && submittingIntent === 'resend'");
    expect(verifyMobileSource).toContain('disabled={code.length !== CODE_LENGTH || isSubmitting}');
    expect(verifyMobileSource).toContain('loading={isVerifyingCode}');
    expect(verifyMobileSource).toContain('loading={isSendingCode}');
    expect(verifyMobileSource).toContain('disabled={isSubmitting}');
    expect(verifyMobileSource).not.toContain('<input type="hidden" name="intent" value="verify"');
  });

  it('disables later booking step navigation while route submissions are pending', () => {
    const employeeSource = readSessionRoute('employee/booking.public.appointment.session.employee.route.tsx');
    const profileCardSource = readSessionRoute('employee/_components/profile-card.tsx');
    const selectServicesSource = readSessionRoute(
      'select-services/booking.public.appointment.session.select-services.route.tsx',
    );
    const selectTimeSource = readSessionRoute('select-time/booking.public.appointment.session.select-time.route.tsx');
    const bookingLinkSource = readWorkspaceFile('app/routes/booking/public/_components/booking-link.tsx');
    const overviewSource = readSessionRoute('overview/booking.public.appointment.session.overview.route.tsx');

    expect(profileCardSource).toContain('loading={isSubmittingProfile}');
    expect(profileCardSource).toContain('disabled={isSubmitting}');
    expect(employeeSource).toContain("const isSubmitting = navigation.state !== 'idle'");
    expect(employeeSource).toContain('loading={isSubmitting && pendingDestination === routes.selectServices}');
    expect(employeeSource).toContain('<BookingActionButton type="button" variant="primary" disabled>');
    expect(selectServicesSource).toContain('loading={isSubmitting}');
    expect(selectServicesSource).toContain('disabled={!hasSelections || isSubmitting}');
    expect(selectServicesSource).toContain("const isSubmitting = navigation.state !== 'idle'");
    expect(selectServicesSource).not.toContain('Tilbake');
    expect(selectTimeSource).toContain('disabled={isSubmitting}');
    expect(selectTimeSource).toContain("const isSubmitting = navigation.state !== 'idle' || isSelectingTime");
    expect(selectTimeSource).toContain(
      '<BookingLink to={continueHref} variant="primary" loading={isContinuing} disabled={isSubmitting}>',
    );
    expect(bookingLinkSource).toContain('aria-busy={loading || undefined}');
    expect(bookingLinkSource).toContain('aria-disabled={isDisabled}');
    expect(overviewSource).toContain('loading={isConfirming}');
    expect(overviewSource).toContain('disabled={isSubmitting}');
    expect(overviewSource).toContain("const isSubmitting = navigation.state !== 'idle'");
  });

  it('overview requires the terms box and keeps marketing optional and unticked', () => {
    const overviewSource = readSessionRoute('overview/booking.public.appointment.session.overview.route.tsx');

    expect(overviewSource).toContain('name="acceptedTerms"');
    expect(overviewSource).toContain('disabled={isSubmitting || (termsRequired && !termsAccepted)}');
    expect(overviewSource).toContain('name="marketingConsentEmail"');
    expect(overviewSource).toContain('name="marketingConsentSms"');
    expect(overviewSource).toContain("formData.get('acceptedTerms') === 'on'");
    expect(overviewSource).toContain("formData.get('marketingConsentEmail') === 'on'");
    expect(overviewSource).toContain("formData.get('marketingConsentSms') === 'on'");
    // Marketing is never required or pre-ticked.
    expect(overviewSource).not.toMatch(/name="marketingConsent(Email|Sms)"[^>]*(required|defaultChecked|checked)/);
  });

  it('keeps cancellation actions pending through redirect loading', () => {
    // Both cancel routes (email link and Mine bookinger) render the shared view.
    const cancelViewSource = readWorkspaceFile('app/routes/booking/public/_components/cancel-appointment.tsx');
    for (const route of [
      'app/routes/booking/public/appointment/cancel/booking.public.appointment.cancel.route.tsx',
      'app/routes/booking/public/appointment/cancel-by-id/booking.public.appointment.cancel-by-id.route.tsx',
    ]) {
      expect(readWorkspaceFile(route)).toContain('<CancelAppointmentView');
    }

    expect(cancelViewSource).toContain(
      "const isSubmitting = navigation.state !== 'idle' && navigation.formMethod === 'POST'",
    );
    expect(cancelViewSource).toContain('loading={isSubmitting}');
  });

  it('saves time selection through one visible route-owned form and continues with a link', () => {
    const selectTimeSource = readSessionRoute('select-time/booking.public.appointment.session.select-time.route.tsx');
    const timeSlotButtonSource = readSessionRoute('select-time/_components/time-slot-button.tsx');
    const quickBookButtonSource = readSessionRoute('select-time/_components/quick-book-button.tsx');

    expect(selectTimeSource).toContain('<startTimeFetcher.Form method="post" preventScrollReset>');
    expect(selectTimeSource).toContain(
      "const pendingStartTime = startTimeFetcher.formData?.get('startTime') as string | null",
    );
    expect(selectTimeSource).toContain('const displayTime = pendingStartTime || selectedStartTime || null');
    expect(timeSlotButtonSource).toContain('name="startTime"');
    expect(timeSlotButtonSource).toContain('value={time}');
    expect(timeSlotButtonSource).toContain('type="submit"');
    // "Første ledige tid" saves the time and goes straight on; the regular times stay on the page until Fortsett.
    expect(quickBookButtonSource).toContain('name="quickBookStartTime"');
    expect(quickBookButtonSource).toContain('value={slot.time}');
    expect(selectTimeSource).toContain('if (returnToOverview) return redirect(routes.overview);');
    expect(selectTimeSource).toContain('return redirect(quickBookStartTime ? routes.contact : routes.selectTime);');
    expect(selectTimeSource).toContain('const continueHref = returnToOverview ? routes.overview : routes.contact');
    expect(selectTimeSource).not.toContain('loaderData.navigation');
    expect(selectTimeSource).not.toContain("const intent = formData.get('intent') as string | null");
    expect(selectTimeSource).not.toContain("if (intent === 'continue')");
    expect(selectTimeSource).not.toContain('return redirect(routes.contact)');
    expect(selectTimeSource).not.toContain("const continueFormId = 'booking-select-time-continue-form'");
    expect(selectTimeSource).not.toContain('form: continueFormId');
    expect(selectTimeSource).not.toContain("buttonType: 'submit'");
    expect(selectTimeSource).not.toContain('BookingBottomActionBar');
    expect(selectTimeSource).not.toContain('useSubmit');
    expect(selectTimeSource).not.toContain('submitInFlightRef');
    expect(selectTimeSource).not.toContain('submitFormId');
  });

  it('uses backend session selectedStartTime as the selected time state', () => {
    const selectTimeSource = readSessionRoute('select-time/booking.public.appointment.session.select-time.route.tsx');

    expect(selectTimeSource).toContain("const selectedStartTime = session.selectedStartTime ?? ''");
    expect(selectTimeSource).toContain(
      "const pendingStartTime = startTimeFetcher.formData?.get('startTime') as string | null",
    );
    expect(selectTimeSource).toContain('const displayTime = pendingStartTime || selectedStartTime || null');
    expect(selectTimeSource).not.toContain('setSelectedTime');
    expect(selectTimeSource).not.toContain('const [selectedTime');
    expect(selectTimeSource).not.toContain('normalizeToOsloIso');
    expect(selectTimeSource).not.toContain('action: loaderData.navigation.contact');
  });
});
