import type { BrowserContext, Page } from '@playwright/test';
import type { Pool } from 'pg';
import { mobileVerificationTokenCookie } from '../../app/routes/booking/public/appointment/session/contact/_utils/mobile-verification-token.cookie.server';
import {
  acceptTerms,
  completeGuestContact,
  fillContactForm,
  selectBookingDetails,
  submitContactForm,
  submitVerificationCode,
} from './booking-flow.helpers';
import {
  mintMobileVerificationToken,
  seedRememberTokenCustomer,
  setMobileVerificationCookie,
} from './booking-remember-token.fixtures';
import { expect, resetMutableBookingState, test } from './fixtures';

let customer: Awaited<ReturnType<typeof seedRememberTokenCustomer>>;

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
  customer = await seedRememberTokenCustomer(db);
});

const DAY_SECONDS = 24 * 60 * 60;

/** A unix timestamp this many seconds from now (negative for the past). */
const epochSecondsFromNow = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

/** Puts a remember token in the browser and checks it is the only cookie, so nothing else can vouch for the visitor. */
async function plantRememberToken(context: BrowserContext, baseURL: string | undefined, token: string) {
  await setMobileVerificationCookie(context, baseURL!, token);
  expect((await context.cookies()).map((cookie) => cookie.name)).toEqual(['mobile_verification_token']);
}

/** Starts a booking and submits the contact form as the seeded customer, expecting to land on the overview. */
async function continueAsRememberedCustomer(page: Page) {
  await selectBookingDetails(page, ['Hårklipp']);
  await expect(page.getByRole('heading', { name: 'Hvordan når vi deg?', exact: true })).toBeVisible();
  await submitContactForm(page, customer.contact);
}

/** The remember token was not accepted: the SMS step shows, and the only challenge targets the existing customer. */
async function expectSmsStepForExistingCustomer(page: Page, db: Pool) {
  await expect(page.getByRole('heading', { name: 'Skriv inn SMS-koden', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Engangskode' })).toBeVisible();

  const challenges = await db.query<{
    session_user_id: string | null;
    target_user_id: string;
    mobile_number: string;
    attempts: number;
    consumed_at: Date | null;
  }>(`
    select session.user_id::text as session_user_id, challenge.target_user_id::text,
      challenge.mobile_number, challenge.attempts, challenge.consumed_at
    from base.booking_otp_challenges challenge
    join booking.appointment_sessions session on session.session_id = challenge.session_id
  `);
  expect(challenges.rows).toEqual([
    {
      session_user_id: null,
      target_user_id: customer.userId,
      mobile_number: customer.mobileNumber,
      attempts: 0,
      consumed_at: null,
    },
  ]);
}

/** The remember token was accepted: the session is attached to the customer and no SMS challenge exists. */
async function expectAttachedWithoutSms(page: Page, db: Pool) {
  await expect(page).toHaveURL(/\/session\/overview(?:[?]|$)/);
  await expect(page.getByRole('heading', { name: 'Se over og bekreft', exact: true })).toBeVisible();
  await expect(page.getByText('Returning Customer', { exact: true })).toBeVisible();

  const session = await db.query<{ user_id: string }>('select user_id::text from booking.appointment_sessions');
  expect(session.rows).toEqual([{ user_id: customer.userId }]);
  const challenges = await db.query<{ count: string }>(
    'select count(*)::text as count from base.booking_otp_challenges',
  );
  expect(challenges.rows[0].count).toBe('0');
}

test('B1 – no remember cookie requires the SMS step', async ({ page, context, db }) => {
  expect(await context.cookies()).toEqual([]);

  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await expectSmsStepForExistingCustomer(page, db);
});

test('B2 – freshly issued remember token skips SMS without auth cookies', async ({ page, context, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, customer.contact);
  await acceptTerms(page);
  await page.getByRole('button', { name: 'Bekreft timebestilling', exact: true }).click();
  await expect(page).toHaveURL(/\/appointment\/success\?/);
  await expect(page.getByRole('heading', { name: 'Timen er bestilt', exact: true })).toBeVisible();

  const challengeQuery = `
    select challenge_id, session_id, consumed_result_user_id::text, consumed_at
    from base.booking_otp_challenges
  `;
  const firstChallenges = await db.query<{
    challenge_id: string;
    session_id: string;
    consumed_result_user_id: string;
    consumed_at: Date;
  }>(challengeQuery);
  expect(firstChallenges.rows).toEqual([
    {
      challenge_id: expect.any(String),
      session_id: expect.any(String),
      consumed_result_user_id: customer.userId,
      consumed_at: expect.any(Date),
    },
  ]);

  // Keep only the issued remember cookie, as if the customer came back without being signed in.
  const rememberCookie = (await context.cookies()).find((cookie) => cookie.name === 'mobile_verification_token');
  expect(rememberCookie).toBeDefined();
  await context.clearCookies();
  await context.addCookies([rememberCookie!]);
  expect((await context.cookies()).map((cookie) => cookie.name)).toEqual(['mobile_verification_token']);

  await continueAsRememberedCustomer(page);
  await expect(page).toHaveURL(/\/session\/overview(?:[?]|$)/);
  await expect(page.getByRole('heading', { name: 'Se over og bekreft', exact: true })).toBeVisible();
  await expect(page.getByText('Returning Customer', { exact: true })).toBeVisible();

  const session = await db.query<{ session_id: string; user_id: string }>(`
    select session_id, user_id::text from booking.appointment_sessions order by id desc limit 1
  `);
  expect(session.rows[0].session_id).not.toBe(firstChallenges.rows[0].session_id);
  expect(session.rows[0].user_id).toBe(customer.userId);
  const challenges = await db.query(challengeQuery);
  expect(challenges.rows).toEqual(firstChallenges.rows);
  const appointments = await db.query<{ user_id: string }>('select user_id::text from booking.appointments');
  expect(appointments.rows).toEqual([{ user_id: customer.userId }]);
});

test('B3 – remember token with one day left skips the SMS step', async ({ page, context, baseURL, db }) => {
  await plantRememberToken(
    context,
    baseURL,
    mintMobileVerificationToken(customer.mobileNumber, epochSecondsFromNow(DAY_SECONDS)),
  );

  await continueAsRememberedCustomer(page);
  await expectAttachedWithoutSms(page, db);

  const mobile = await db.query<{ user_id: string; verification_status: string }>(
    'select user_id::text, verification_status from base.user_mobile_number where mobile_number = $1',
    [customer.mobileNumber],
  );
  expect(mobile.rows).toEqual([{ user_id: customer.userId, verification_status: 'VERIFIED' }]);
});

test('B4 – remember token with one minute left still skips the SMS step', async ({ page, context, baseURL, db }) => {
  await plantRememberToken(
    context,
    baseURL,
    mintMobileVerificationToken(customer.mobileNumber, epochSecondsFromNow(60)),
  );

  await continueAsRememberedCustomer(page);
  await expectAttachedWithoutSms(page, db);
});

test('B5 – remember token expired five seconds ago requires the SMS step', async ({ page, context, baseURL, db }) => {
  // The cookie stays in the browser: the backend must reject the expiry embedded in the token itself.
  await plantRememberToken(
    context,
    baseURL,
    mintMobileVerificationToken(customer.mobileNumber, epochSecondsFromNow(-5)),
  );

  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await expectSmsStepForExistingCustomer(page, db);
});

test('B6 – valid remember token for a different mobile requires the SMS step', async ({
  page,
  context,
  baseURL,
  db,
}) => {
  await plantRememberToken(
    context,
    baseURL,
    mintMobileVerificationToken('+4792000032', epochSecondsFromNow(DAY_SECONDS)),
  );

  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await expectSmsStepForExistingCustomer(page, db);
});

test('B7 – tampered remember-token signature falls back to SMS without an error page', async ({
  page,
  context,
  baseURL,
  db,
}) => {
  const token = mintMobileVerificationToken(customer.mobileNumber, epochSecondsFromNow(DAY_SECONDS));
  const signatureStart = token.lastIndexOf(':') + 1;
  const replacement = token[signatureStart] === 'A' ? 'B' : 'A';
  await plantRememberToken(
    context,
    baseURL,
    token.slice(0, signatureStart) + replacement + token.slice(signatureStart + 1),
  );

  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await expectSmsStepForExistingCustomer(page, db);
  await expect(page.getByRole('button', { name: 'Bekreft mobilnummer', exact: true })).toBeVisible();
});

test('B8a – correctly signed token with the wrong purpose requires the SMS step', async ({
  page,
  context,
  baseURL,
  db,
}) => {
  await plantRememberToken(
    context,
    baseURL,
    mintMobileVerificationToken(customer.mobileNumber, epochSecondsFromNow(DAY_SECONDS), 'PASSWORD_RESET'),
  );

  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await expectSmsStepForExistingCustomer(page, db);
});

test('B8b – malformed remember token falls back to SMS without an error page', async ({
  page,
  context,
  baseURL,
  db,
}) => {
  await plantRememberToken(context, baseURL, 'not-a-valid-token');

  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await expectSmsStepForExistingCustomer(page, db);
});

test('B9 – successful SMS verification issues a remember cookie with about 60 days left', async ({ page, context }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, customer.contact);
  await submitVerificationCode(page, '111111');
  await page.waitForURL(/\/overview/);

  const cookie = (await context.cookies()).find((item) => item.name === 'mobile_verification_token');
  expect(cookie).toBeDefined();

  // The portal cookie wraps the backend token: "<mobile>:<expiresEpochSeconds>:<purpose>:<signature>".
  const token = await mobileVerificationTokenCookie.parse(`mobile_verification_token=${cookie!.value}`);
  expect(typeof token).toBe('string');
  const [mobile, expires, purpose] = (token as string).split(':');
  expect(mobile).toBe(customer.mobileNumber);
  expect(purpose).toBe('MOBILE_VERIFICATION');

  const daysLeft = (Number(expires) - Date.now() / 1000) / DAY_SECONDS;
  expect(daysLeft).toBeGreaterThan(59);
  expect(daysLeft).toBeLessThan(61);
});
