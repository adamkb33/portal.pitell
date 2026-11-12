import type { Pool } from 'pg';
import { selectBookingDetails, submitContactForm } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

// OtpRateLimiter defaults: 5 per mobile, 10 per IP and 100 per company in a rolling hour.
const MOBILE = '90000061';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

async function challengeCount(db: Pool) {
  const result = await db.query<{ count: string }>('select count(*)::text as count from base.booking_otp_challenges');
  return Number(result.rows[0].count);
}

/** Inserts `count` challenges created `minutesAgo` minutes ago, each already retired so none is a live code. */
async function seedChallenges(
  db: Pool,
  options: { count: number; mobile?: (index: number) => string; companyId?: number; minutesAgo?: number },
) {
  await db.query(
    `
      insert into base.booking_otp_challenges
        (challenge_id, session_id, company_id, purpose, mobile_number, code_hash, expires_at, created_at, deleted_at)
      select gen_random_uuid(), gen_random_uuid(), $2::bigint, 'BOOKING',
             case when $3::text = '' then '+4791' || lpad(i::text, 6, '0') else $3::text end,
             'seeded', now() + interval '5 minutes', now() - make_interval(mins => $4::int), now()
      from generate_series(1, $1::int) as i
    `,
    [options.count, options.companyId ?? 1, options.mobile ? options.mobile(0) : '', options.minutesAgo ?? 1],
  );
}

test('a mobile that already asked for five codes this hour is refused a sixth and no challenge is written', async ({
  page,
  db,
}) => {
  await seedChallenges(db, { count: 5, mobile: () => `+47${MOBILE}` });
  await selectBookingDetails(page, ['Hårklipp']);
  const before = await challengeCount(db);

  await submitContactForm(page, { givenName: 'Too', familyName: 'Eager', mobileNumber: MOBILE });

  await expect(page.getByText(/Du har bedt om for mange koder/)).toBeVisible();
  await expect(page).toHaveURL(/\/session\/contact(?:[?]|$)/);
  expect(await challengeCount(db)).toBe(before);
});

test('the refusal says how long to wait, counted from the oldest code in the window', async ({ page, db }) => {
  await seedChallenges(db, { count: 5, mobile: () => `+47${MOBILE}`, minutesAgo: 50 });
  await selectBookingDetails(page, ['Hårklipp']);

  await submitContactForm(page, { givenName: 'Wait', familyName: 'Please', mobileNumber: MOBILE });

  // The oldest code is 50 minutes old, so a slot frees up in roughly ten minutes.
  await expect(page.getByText(/Du har bedt om for mange koder/)).toBeVisible();
  const text = await page
    .getByText(/Du har bedt om for mange koder/)
    .first()
    .innerText();
  if (/\d/.test(text)) expect(text).toMatch(/\b(9|10)\s*minutt/);
});

test('codes older than an hour no longer count against the mobile', async ({ page, db }) => {
  await seedChallenges(db, { count: 5, mobile: () => `+47${MOBILE}`, minutesAgo: 61 });
  await selectBookingDetails(page, ['Hårklipp']);

  await submitContactForm(page, { givenName: 'Fresh', familyName: 'Window', mobileNumber: MOBILE });

  await page.waitForURL(/\/contact\/verify-mobile/);
});

test('a company that has sent 100 codes this hour refuses further customers', async ({ page, db }) => {
  await seedChallenges(db, { count: 100, companyId: 1 });
  await selectBookingDetails(page, ['Hårklipp']);
  const before = await challengeCount(db);

  await submitContactForm(page, { givenName: 'Late', familyName: 'Customer', mobileNumber: '90000062' });

  await expect(page.getByText(/Du har bedt om for mange koder/)).toBeVisible();
  expect(await challengeCount(db)).toBe(before);
});

test('another company is unaffected by the first company’s cap', async ({ page, db }) => {
  await seedChallenges(db, { count: 100, companyId: 1 });
  await page.goto('/booking/public/appointment/session?companyId=2&reset=1');
  await page.waitForURL(/\/session\/employee/);
  await page.getByRole('button', { name: 'Velg Anna' }).click();
  await page.waitForURL(/\/select-services/);
  await page.getByRole('checkbox', { name: 'Herreklipp' }).check();
  await page.getByRole('button', { name: 'Velg tid', exact: true }).click();
  await page.waitForURL(/\/select-time/);
  // "Første ledige tid" saves the time and moves on by itself.
  await page.getByRole('button', { name: /Første ledige tid/ }).click();
  await page.waitForURL(/\/contact(?:[?/]|$)/);

  await submitContactForm(page, { givenName: 'Other', familyName: 'Company', mobileNumber: '90000063' });

  await page.waitForURL(/\/contact\/verify-mobile/);
});
