import type { Browser, Page } from '@playwright/test';
import type { Pool } from 'pg';
import { acceptTerms, completeGuestContact, selectBookingDetails, submitContactForm } from './booking-flow.helpers';
import { mintCancelAppointmentToken } from './booking-remember-token.fixtures';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

async function counts(db: Pool) {
  const result = await db.query<{ users: string; challenges: string }>(`
    select
      (select count(*) from base.users)::text as users,
      (select count(*) from base.booking_otp_challenges)::text as challenges
  `);
  return result.rows[0];
}

type Contact = { givenName: string; familyName: string; mobileNumber: string };

/** Runs the callback as a different visitor: a fresh browser context with no cookies and no booking session. */
async function asStranger(browser: Browser, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext();
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

/** Books one haircut as a guest and returns the new appointment's id. */
async function bookAs(page: Page, contact: Contact) {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, contact);
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  return Number(new URL(page.url()).searchParams.get('appointmentId'));
}

test.describe('contact form validation', () => {
  test('empty names are blocked by the browser and nothing is created', async ({ page, db }) => {
    await selectBookingDetails(page, ['Hårklipp']);
    const before = await counts(db);

    await submitContactForm(page, { givenName: '', familyName: '', mobileNumber: '90000021' });

    await expect(page).toHaveURL(/\/session\/contact(?:[?]|$)/);
    await expect(page.getByLabel('Fornavn')).toHaveJSProperty('validity.valueMissing', true);
    await expect(page.getByLabel('Etternavn')).toHaveJSProperty('validity.valueMissing', true);
    expect(await counts(db)).toEqual(before);
  });

  test('a mobile number with fewer than eight digits is rejected with an inline error', async ({ page, db }) => {
    await selectBookingDetails(page, ['Hårklipp']);
    const before = await counts(db);

    await submitContactForm(page, {
      givenName: 'Short',
      familyName: 'Number',
      mobileNumber: '9000002',
    });

    await expect(page.getByText('Mobilnummer må være 8 siffer')).toBeVisible();
    await expect(page).toHaveURL(/\/session\/contact(?:[?]|$)/);
    expect(await counts(db)).toEqual(before);
  });

  test('a malformed email is rejected with an inline error and no challenge is sent', async ({ page, db }) => {
    await selectBookingDetails(page, ['Hårklipp']);
    const before = await counts(db);

    // "name@host" satisfies the browser's own email check but not the portal's validator.
    await submitContactForm(page, {
      givenName: 'Bad',
      familyName: 'Email',
      mobileNumber: '90000023',
      email: 'name@host',
    });

    await expect(page.getByText('Ugyldig e-postadresse')).toBeVisible();
    await expect(page).toHaveURL(/\/session\/contact(?:[?]|$)/);
    expect(await counts(db)).toEqual(before);
  });
});

test.describe('success page URL handling', () => {
  test('a non-numeric appointmentId sends the visitor back to the start', async ({ page }) => {
    await page.goto('/booking/public/appointment/success?companyId=1&appointmentId=abc');
    await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
    await expect(page).not.toHaveURL(/\/success/);
  });

  test('a missing appointmentId sends the visitor back to the start', async ({ page }) => {
    await page.goto('/booking/public/appointment/success?companyId=1');
    await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
    await expect(page).not.toHaveURL(/\/success/);
  });

  test('a missing companyId shows an error instead of crashing', async ({ page }) => {
    await page.goto('/booking/public/appointment/success?appointmentId=1');
    // The loader throws a plain Error, which resolveErrorPayload turns into the generic fallback message.
    await expect(page.getByRole('heading', { name: 'Timen er bestilt', exact: true })).toBeVisible();
    await expect(page.getByText('Kunne ikke hente bekreftelse')).toBeVisible();
  });

  test('an unknown appointmentId shows a friendly error and no appointment details', async ({ page }) => {
    await page.goto('/booking/public/appointment/success?companyId=1&appointmentId=999999');
    await expect(page.getByRole('heading', { name: 'Timen er bestilt', exact: true })).toBeVisible();
    await expect(page.getByText('Kunne ikke hente avtaledetaljene')).toBeVisible();
  });
});

test.describe('success page authorization', () => {
  // The backend `get-appointment` endpoint itself has no ownership check, so the success page enforces it:
  // only the signed-in owner, or the browser whose booking session holds the same user, sees the details.
  test('another visitor cannot read a customer’s appointment by changing the id', async ({ page, browser }) => {
    const appointmentId = await bookAs(page, {
      givenName: 'Private',
      familyName: 'Customer',
      mobileNumber: '90000024',
    });
    // Control: the owner still sees their own booking.
    await expect(page.getByText('Hårklipp').first()).toBeVisible();

    await asStranger(browser, async (stranger) => {
      await stranger.goto(`/booking/public/appointment/success?companyId=1&appointmentId=${appointmentId}`);
      await expect(stranger.getByText('Hårklipp')).toHaveCount(0);
    });
  });
});

test.describe('cancel link authorization', () => {
  test('a genuinely signed cancel link shows the appointment', async ({ page }) => {
    const appointmentId = await bookAs(page, { givenName: 'Token', familyName: 'Holder', mobileNumber: '90000025' });
    const token = mintCancelAppointmentToken(appointmentId, Math.floor(Date.now() / 1000) + 3600);

    await page.goto(`/booking/public/appointment/cancel?token=${token}`);
    await expect(page.getByRole('heading', { name: 'Avbestille timen?' })).toBeVisible();
    await expect(page.getByText('Hårklipp').first()).toBeVisible();
  });

  test('the email link cancels with one tap and returns to the salon with the toast', async ({ page, db }) => {
    const appointmentId = await bookAs(page, { givenName: 'Link', familyName: 'Canceller', mobileNumber: '90000027' });
    await db.query(
      "update booking.appointments set start_time = start_time + interval '7 days', end_time = end_time + interval '7 days' where id = $1",
      [appointmentId],
    );
    const token = mintCancelAppointmentToken(appointmentId, Math.floor(Date.now() / 1000) + 3600);

    await page.goto(`/booking/public/appointment/cancel?token=${token}`);
    await page.getByRole('button', { name: 'Avbestill timen', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Timen er avbestilt' })).toBeVisible();
    await expect(page).not.toHaveURL(/\/cancel/);
    // Cancelled by the link: no longer a live appointment (this endpoint removes it rather than marking it).
    const live = await db.query(
      'select 1 from booking.appointments where id = $1 and cancelled_at is null and deleted_at is null',
      [appointmentId],
    );
    expect(live.rowCount).toBe(0);

    // The same link again: nothing left to cancel.
    await page.goto(`/booking/public/appointment/cancel?token=${token}`);
    await expect(page.getByRole('heading', { name: 'Timen er allerede avbestilt' })).toBeVisible();
  });

  test('a forged cancel link for someone else’s appointment shows nothing private', async ({ page }) => {
    const appointmentId = await bookAs(page, { givenName: 'Forged', familyName: 'Victim', mobileNumber: '90000026' });
    // Right appointment id and a plausible expiry, but signed with a secret the attacker made up.
    const forged = mintCancelAppointmentToken(appointmentId, Math.floor(Date.now() / 1000) + 3600, 'attacker-secret');

    await page.goto(`/booking/public/appointment/cancel?token=${forged}`);
    await expect(page.getByRole('heading', { name: 'Avbestille timen?' })).toHaveCount(0);
    await expect(page.getByText('Forged Victim')).toHaveCount(0);
    await expect(page.getByText('90000026')).toHaveCount(0);
  });
});
