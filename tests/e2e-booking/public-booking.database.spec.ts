import type { Pool } from 'pg';
import {
  SEEDED_SERVICES,
  acceptTerms,
  completeGuestContact,
  fillContactForm,
  pickFirstAvailableTime,
  selectBookingDetails,
  selectServices,
  selectServicesAndTime,
  submitInvalidVerificationCode,
  submitVerificationCode,
} from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

test('guest booking persists verified contact, selected services, appointment, and cleared session state', async ({
  page,
  db,
}) => {
  await selectBookingDetails(page, SEEDED_SERVICES);
  await fillContactForm(page, {
    givenName: 'Database',
    familyName: 'Journey',
    mobileNumber: '90000001',
  });

  const pending = await db.query<{
    session_id: string;
    user_id: string | null;
    challenge_id: string;
    attempts: number;
    consumed_at: Date | null;
  }>(`
    select session.session_id, session.user_id::text, challenge.challenge_id, challenge.attempts, challenge.consumed_at
    from booking.appointment_sessions session
    join base.booking_otp_challenges challenge on challenge.session_id = session.session_id
    order by session.id desc, challenge.id desc
    limit 1
  `);
  const pendingState = pending.rows[0];
  expect(pendingState).toBeDefined();
  expect(pendingState?.user_id).toBeNull();
  expect(pendingState?.attempts).toBe(0);
  expect(pendingState?.consumed_at).toBeNull();

  // A wrong code is counted, but does not consume the challenge or attach a user.
  await submitInvalidVerificationCode(page, '000000');
  const rejected = await db.query<{ attempts: number; consumed_at: Date | null; user_id: string | null }>(
    `
      select challenge.attempts, challenge.consumed_at, session.user_id::text
      from base.booking_otp_challenges challenge
      join booking.appointment_sessions session on session.session_id = challenge.session_id
      where challenge.challenge_id = $1
    `,
    [pendingState?.challenge_id],
  );
  expect(rejected.rows[0]).toEqual({ attempts: 1, consumed_at: null, user_id: null });

  await submitVerificationCode(page, '111111');
  await page.waitForURL(/\/overview/);

  const verified = await db.query<{
    session_user_id: string;
    challenge_user_id: string;
    verification_status: string;
  }>(
    `
      select
        session.user_id::text as session_user_id,
        challenge.consumed_result_user_id::text as challenge_user_id,
        mobile.verification_status
      from booking.appointment_sessions session
      join base.booking_otp_challenges challenge on challenge.session_id = session.session_id
      join base.user_mobile_number mobile on mobile.user_id = session.user_id
      where session.session_id = $1
    `,
    [pendingState?.session_id],
  );
  expect(verified.rows[0]?.session_user_id).toBe(verified.rows[0]?.challenge_user_id);
  expect(verified.rows[0]?.verification_status).toBe('VERIFIED');

  const beforeConfirmation = await db.query<{ count: string }>(
    'select count(*)::text as count from booking.appointments',
  );
  expect(beforeConfirmation.rows[0]?.count).toBe('0');

  await acceptTerms(page);

  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  const appointmentId = Number(new URL(page.url()).searchParams.get('appointmentId'));
  expect(appointmentId).toBeGreaterThan(0);

  const persisted = await db.query<{
    id: string;
    user_id: string;
    profile_id: string;
    service_rows: string;
    total_quantity: string;
    selected_start_time: Date | null;
    remaining_session_services: string;
  }>(
    `
      select
        appointment.id::text,
        appointment.user_id::text,
        appointment.profile_id::text,
        count(appointment_service.id)::text as service_rows,
        sum(appointment_service.quantity)::text as total_quantity,
        session.selected_start_time,
        (
          select count(*)::text
          from booking.appointment_session_services selected
          where selected.appointment_session_id = session.id
        ) as remaining_session_services
      from booking.appointments appointment
      join booking.appointment_services appointment_service on appointment_service.appointment_id = appointment.id
      join booking.appointment_sessions session on session.session_id = $2
      where appointment.id = $1
      group by appointment.id, session.id
    `,
    [appointmentId, pendingState?.session_id],
  );
  expect(persisted.rows[0]).toMatchObject({
    id: String(appointmentId),
    user_id: verified.rows[0]?.session_user_id,
    profile_id: '1',
    service_rows: '3',
    total_quantity: '3',
    // Confirming clears the session's pending booking state.
    selected_start_time: null,
    remaining_session_services: '0',
  });

  const allAppointments = await db.query<{ count: string }>('select count(*)::text as count from booking.appointments');
  expect(allAppointments.rows[0]?.count).toBe('1');

  // The confirmation should be readable without scrolling on a phone.
  const appointmentHeading = page.getByRole('heading', { level: 2 }).first();
  await expect(appointmentHeading).toBeVisible();
  const appointmentHeadingBox = await appointmentHeading.boundingBox();
  expect(appointmentHeadingBox).not.toBeNull();
  expect(appointmentHeadingBox!.y + appointmentHeadingBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

  const calendarLink = page.getByRole('link', { name: /Legg til i kalender/ });
  const calendarHref = await calendarLink.getAttribute('href');
  const calendarDownload = await calendarLink.getAttribute('download');
  expect(calendarHref).toMatch(/^data:text\/calendar/);
  expect(calendarDownload).toMatch(/\.ics$/);
  const calendarBody = decodeURIComponent(calendarHref!.split(',').slice(1).join(','));
  expect(calendarBody).toContain('BEGIN:VEVENT');
  expect(calendarBody).toContain('DTSTART:');
  expect(calendarBody).toContain('DTEND:');
});

test('editing contact keeps the attached user until a changed mobile is successfully verified', async ({
  page,
  db,
}) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, {
    givenName: 'Original',
    familyName: 'Contact',
    mobileNumber: '90000002',
  });

  const initial = await latestSession(db);
  expect(initial.user_id).not.toBeNull();

  await page.getByRole('link', { name: 'Endre kontakt' }).click();
  await expect(page.getByLabel('Fornavn')).toHaveValue('Original');
  await expect(page.getByLabel('Etternavn')).toHaveValue('Contact');
  await expect(page.getByLabel('Mobilnummer')).toHaveValue('90000002');

  const challengesBeforeNameChange = await challengeCount(db, initial.session_id);
  await page.getByLabel('Fornavn').fill('Renamed');
  await page.getByRole('button', { name: /Lagre endringer/ }).click();
  await page.waitForURL(/\/overview/);

  const afterNameChange = await latestSession(db);
  expect(afterNameChange.user_id).toBe(initial.user_id);
  expect(await challengeCount(db, initial.session_id)).toBe(challengesBeforeNameChange);
  const renamedUser = await db.query<{ given_name: string }>('select given_name from base.users where id = $1', [
    initial.user_id,
  ]);
  expect(renamedUser.rows[0]?.given_name).toBe('Renamed');

  await page.getByRole('link', { name: 'Endre kontakt' }).click();
  await page.getByLabel('Mobilnummer').fill('91000002');
  await page.getByRole('button', { name: /Lagre endringer/ }).click();
  await page.waitForURL(/\/contact\/verify-mobile/);

  const duringReplacement = await latestSession(db);
  expect(duringReplacement.user_id).toBe(initial.user_id);

  await submitInvalidVerificationCode(page, '000000');
  expect((await latestSession(db)).user_id).toBe(initial.user_id);

  await page.getByRole('button', { name: /Avbryt endring/ }).click();
  await page.waitForURL(/\/overview/);
  expect((await latestSession(db)).user_id).toBe(initial.user_id);

  await page.getByRole('link', { name: 'Endre kontakt' }).click();
  await page.getByLabel('Mobilnummer').fill('91000002');
  await page.getByRole('button', { name: /Lagre endringer/ }).click();
  await page.waitForURL(/\/contact\/verify-mobile/);
  await submitVerificationCode(page, '111111');
  await page.waitForURL(/\/overview/);

  const afterReplacement = await latestSession(db);
  expect(afterReplacement.user_id).not.toBe(initial.user_id);
  const consumed = await db.query<{ consumed_result_user_id: string; mobile_number: string }>(
    `
      select consumed_result_user_id::text, mobile_number
      from base.booking_otp_challenges
      where session_id = $1 and consumed_at is not null
      order by id desc
      limit 1
    `,
    [initial.session_id],
  );
  expect(consumed.rows[0]).toEqual({ consumed_result_user_id: afterReplacement.user_id, mobile_number: '+4791000002' });
});

test('an authenticated verified user continues from time selection to overview without another SMS challenge', async ({
  page,
  db,
}) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, {
    givenName: 'Known',
    familyName: 'User',
    mobileNumber: '90000003',
  });
  const authenticatedUser = (await latestSession(db)).user_id;
  const challengeTotal = await db.query<{ count: string }>(
    'select count(*)::text as count from base.booking_otp_challenges',
  );

  await selectBookingDetails(page, ['Hårklipp']);
  await page.waitForURL(/\/overview/);

  const attached = await latestSession(db);
  expect(attached.user_id).toBe(authenticatedUser);
  const challengeTotalAfter = await db.query<{ count: string }>(
    'select count(*)::text as count from base.booking_otp_challenges',
  );
  expect(challengeTotalAfter.rows[0]?.count).toBe(challengeTotal.rows[0]?.count);
});

test('a mistyped code can be corrected with Backspace and submitted', async ({ page }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, { givenName: 'Typo', familyName: 'Fixer', mobileNumber: '90000004' });

  const input = page.getByRole('textbox', { name: 'Engangskode' });
  await input.click();
  await page.keyboard.type('111115');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('1');
  await expect(input).toHaveValue('111111');

  await page.getByRole('button', { name: /Bekreft mobilnummer/ }).click();
  await page.waitForURL(/\/overview/);
});

test('a company with several providers lets the customer choose, and books the one they picked', async ({
  page,
  db,
}) => {
  await page.goto('/booking/public/appointment/session?companyId=2&reset=1');
  await page.waitForURL(/\/session\/employee/);
  await expect(page.getByRole('button', { name: 'Velg Anna' })).toBeVisible();

  await page.getByRole('button', { name: 'Velg Bjørn' }).click();
  await page.waitForURL(/\/select-services/);
  await selectServicesAndTime(page, ['Herreklipp']);
  await completeGuestContact(page, { givenName: 'Chose', familyName: 'Bjørn', mobileNumber: '90000005' });

  await acceptTerms(page);

  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  // Bjørn is booking_profile 3, Anna is 2.
  const booked = await db.query<{ profile_id: string }>(
    'select profile_id::text from booking.appointments where id = $1',
    [Number(new URL(page.url()).searchParams.get('appointmentId'))],
  );
  expect(booked.rows[0]?.profile_id).toBe('3');
});

test('two customers cannot book the same slot', async ({ page, browser, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, { givenName: 'First', familyName: 'Customer', mobileNumber: '90000006' });

  // A second customer reaches the overview for the same slot before anyone has confirmed.
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  try {
    await selectBookingDetails(secondPage, ['Hårklipp']);
    await completeGuestContact(secondPage, { givenName: 'Second', familyName: 'Customer', mobileNumber: '90000007' });

    const contested = await db.query<{ distinct_start_times: string }>(
      'select count(distinct selected_start_time)::text as distinct_start_times from booking.appointment_sessions',
    );
    expect(contested.rows[0]?.distinct_start_times).toBe('1');

    await acceptTerms(page);

    await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
    await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

    // The loser is sent back to pick another time rather than into a dead end.
    await acceptTerms(secondPage);
    await secondPage.getByRole('button', { name: /Bekreft timebestilling/ }).click();
    await secondPage.waitForURL(/\/select-time/);

    const appointments = await db.query<{ count: string }>('select count(*)::text as count from booking.appointments');
    expect(appointments.rows[0]?.count).toBe('1');
  } finally {
    await secondContext.close();
  }
});

test('an expired challenge is refused even when the code is correct', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, { givenName: 'Late', familyName: 'Arrival', mobileNumber: '90000008' });

  await db.query("update base.booking_otp_challenges set expires_at = now() - interval '1 minute'");

  await submitVerificationCode(page, '111111');
  await expect(page.getByRole('alert')).toHaveText('Koden er utløpt. Be om en ny kode.');

  const stranded = await latestSession(db);
  expect(stranded.user_id).toBeNull();
  const consumed = await db.query<{ count: string }>(
    'select count(*)::text as count from base.booking_otp_challenges where consumed_at is not null',
  );
  expect(consumed.rows[0]?.count).toBe('0');
});

test('choosing the same service twice books it with a quantity of two', async ({ page, db }) => {
  await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
  await page.waitForURL(/\/select-services/);
  await selectServices(page, ['Hårklipp']);
  await page
    .getByRole('group', { name: 'Antall Hårklipp', exact: true })
    .getByRole('button', { name: 'Flere' })
    .click();
  await pickFirstAvailableTime(page);
  await completeGuestContact(page, { givenName: 'Two', familyName: 'Cuts', mobileNumber: '90000009' });

  await acceptTerms(page);

  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  const services = await db.query<{ rows_count: string; quantity: string }>(
    `
      select count(*)::text as rows_count, max(quantity)::text as quantity
      from booking.appointment_services
      where appointment_id = $1
    `,
    [Number(new URL(page.url()).searchParams.get('appointmentId'))],
  );
  expect(services.rows[0]).toEqual({ rows_count: '1', quantity: '2' });
});

test('a customer can cancel their own appointment', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, { givenName: 'Will', familyName: 'Cancel', mobileNumber: '90000010' });
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  const appointmentId = Number(new URL(page.url()).searchParams.get('appointmentId'));

  // Push the appointment well clear of any cancellation cut-off so the test does not depend
  // on how close the first available slot happens to be when it runs.
  await db.query(
    "update booking.appointments set start_time = now() + interval '7 days', end_time = now() + interval '7 days 20 minutes' where id = $1",
    [appointmentId],
  );

  await page.goto('/booking/public/my-appointments');
  await page.getByRole('link', { name: 'Avbestill' }).first().click();
  // The cancel page is the question itself: one tap, no second dialog.
  await page.getByRole('button', { name: 'Avbestill timen', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Timen er avbestilt' })).toBeVisible();

  await expect
    .poll(async () => {
      const cancelled = await db.query<{ cancelled_at: Date | null }>(
        'select cancelled_at from booking.appointments where id = $1',
        [appointmentId],
      );
      return cancelled.rows[0]?.cancelled_at !== null;
    })
    .toBe(true);
});

test('a confirmed booking with an email address records only the skipped email for the customer', async ({
  page,
  db,
}) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, {
    givenName: 'Notified',
    familyName: 'Guest',
    mobileNumber: '90000011',
    email: 'notified.guest@booking.e2e.invalid',
  });
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  await expect(page.getByText('Vi har sendt bekreftelse på e-post.', { exact: true })).toBeVisible();
  const appointmentId = new URL(page.url()).searchParams.get('appointmentId');

  const customerDeliveries = await db.query<{
    channel: string;
    recipient_address: string;
    sent_at: Date | null;
    failed_at: Date | null;
    provider_message_id: string;
  }>(
    `
      select channel, recipient_address, sent_at, failed_at, provider_message_id
      from notification.notification_deliveries
      where source_ref_type = 'APPOINTMENT'
        and source_ref_id = $1
        and recipient_address in ('notified.guest@booking.e2e.invalid', '+4790000011')
      order by channel
    `,
    [appointmentId],
  );

  // The row is always written; outside production the provider call is skipped, so sent_at stays null.
  expect(customerDeliveries.rows).toEqual([
    {
      channel: 'EMAIL',
      recipient_address: 'notified.guest@booking.e2e.invalid',
      sent_at: null,
      failed_at: null,
      provider_message_id: 'skipped:non-production',
    },
  ]);
});

test('a booking without an email address still succeeds and records only the SMS', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, { givenName: 'No', familyName: 'Email', mobileNumber: '90000012' });
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  await expect(page.getByText('Vi har sendt bekreftelse på SMS.', { exact: true })).toBeVisible();
  const appointmentId = new URL(page.url()).searchParams.get('appointmentId');

  const customerDeliveries = await db.query<{ channel: string; recipient_address: string }>(
    `
      select channel, recipient_address
      from notification.notification_deliveries
      where source_ref_type = 'APPOINTMENT' and source_ref_id = $1 and recipient_address = '+4790000012'
    `,
    [appointmentId],
  );
  expect(customerDeliveries.rows).toEqual([{ channel: 'SMS', recipient_address: '+4790000012' }]);
});

test('five wrong codes exhaust the challenge, and the correct code no longer works', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, { givenName: 'Brute', familyName: 'Force', mobileNumber: '90000013' });

  const recordedAttempts = async () => {
    const result = await db.query<{ attempts: number }>(
      'select attempts from base.booking_otp_challenges order by id desc limit 1',
    );
    return result.rows[0]?.attempts ?? 0;
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await submitVerificationCode(page, '000000');
    await expect.poll(recordedAttempts).toBe(attempt);
    await expect(page.getByRole('alert')).toHaveText(
      attempt < 5 ? `Feil kode. ${5 - attempt} forsøk igjen.` : 'For mange feil forsøk. Be om en ny kode.',
    );
  }

  await submitVerificationCode(page, '111111');
  await expect(page.getByRole('alert')).toHaveText('For mange feil forsøk. Be om en ny kode.');
  expect((await latestSession(db)).user_id).toBeNull();
});

async function latestSession(db: Pool) {
  const result = await db.query<{ session_id: string; user_id: string | null }>(`
    select session_id, user_id::text
    from booking.appointment_sessions
    where deleted_at is null
    order by id desc
    limit 1
  `);
  const session = result.rows[0];
  if (!session) throw new Error('Expected an active booking session');
  return session;
}

async function challengeCount(db: Pool, sessionId: string) {
  const result = await db.query(
    'select count(*)::int as count from base.booking_otp_challenges where session_id = $1',
    [sessionId],
  );
  return Number(result.rows[0]?.count ?? 0);
}
