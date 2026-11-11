import type { ReactNode } from 'react';
import { CalendarX, Clock } from 'lucide-react';
import { Form, useNavigation } from 'react-router';
import type { GroupedServiceGroupDto } from '~/api/generated';
import { formatDateParts } from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';
import { AppointmentSummaryCard } from './appointment-summary-card';
import { BookingActionButton } from './booking-action-button';
import { BookingFooterNav } from './booking-footer-nav';
import { BookingLink } from './booking-link';

const FORM_ID = 'cancel-appointment';

type CancelAppointmentViewProps = {
  appointment: { startTime: string; endTime: string; groupedServiceGroups: GroupedServiceGroupDto[] };
  companyName?: string;
  addressText?: string;
  /** False once the appointment has started: the bar says so and offers `backHref` instead of cancelling. */
  canCancel: boolean;
  /** Where "Behold timen" goes: back to the appointment, or to the salon when the customer came from the email. */
  backHref: string;
  /** The link in the bar once the appointment has started ("Til timen", "Bestill ny time"). */
  startedLinkLabel: string;
  /** Extra fields the route's action needs (the email link's token). */
  formFields?: ReactNode;
};

/**
 * The customer's cancel page (approved sketch 2026-11-11), for both the "Mine bookinger" link and the email link.
 * The page is the question: the appointment, "Dette kan ikke angres.", and "Behold timen" | "Avbestill timen" in the
 * booking bar, so there is no second confirm dialog. Once the appointment has started, the bar says why it can't be
 * cancelled instead.
 */
export function CancelAppointmentView({
  appointment,
  companyName,
  addressText,
  canCancel,
  backHref,
  startedLinkLabel,
  formFields,
}: CancelAppointmentViewProps) {
  const navigation = useNavigation();
  // Busy from the submit until the redirect after it has loaded, so it can't be sent twice; plain links don't count.
  const isSubmitting = navigation.state !== 'idle' && navigation.formMethod === 'POST';
  const start = formatDateParts(appointment.startTime);
  const end = formatDateParts(appointment.endTime);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-booking-text md:text-4xl">Avbestille timen?</h1>

      <AppointmentSummaryCard
        groupedServiceGroups={appointment.groupedServiceGroups}
        companyName={companyName}
        addressText={addressText}
        header={
          <>
            <p className="text-2xl font-bold tracking-tight text-booking-text">{start.longDate}</p>
            <p className="mt-1 flex items-center gap-2 text-booking-text-muted">
              <Clock className="size-4" aria-hidden />
              {start.time}–{end.time}
            </p>
          </>
        }
      />

      {canCancel ? (
        <>
          <p className="text-center text-sm text-booking-text-muted md:text-left">Dette kan ikke angres.</p>
          <Form id={FORM_ID} method="post" replace>
            {formFields}
          </Form>
        </>
      ) : null}

      <BookingFooterNav message={canCancel ? undefined : 'Timen har startet og kan ikke avbestilles her.'}>
        {canCancel ? (
          <>
            <BookingLink to={backHref} variant="outline">
              Behold timen
            </BookingLink>
            <BookingActionButton type="submit" form={FORM_ID} variant="danger" loading={isSubmitting}>
              Avbestill timen
            </BookingActionButton>
          </>
        ) : (
          <BookingLink to={backHref}>{startedLinkLabel}</BookingLink>
        )}
      </BookingFooterNav>
    </div>
  );
}

/** Nothing to cancel: already cancelled, someone else's, or a link that no longer works. One way on. */
export function CancelAppointmentGone({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-booking-action-muted text-booking-action-text">
        <CalendarX className="size-8" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-booking-text">{title}</h1>
      <BookingLink to={href} className="min-w-56">
        {linkLabel}
      </BookingLink>
    </div>
  );
}
