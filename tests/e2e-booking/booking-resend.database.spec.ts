import { fillContactForm, selectBookingDetails, submitVerificationCode } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

const CONTACT = { givenName: 'Resend', familyName: 'Customer', mobileNumber: '90000041' };

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

test('a new code cannot be requested during the cooldown', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, CONTACT);

  const resend = page.getByRole('button', { name: /^Send ny kode om \d+ (s|min)$/ });
  await expect(resend).toBeVisible();
  await expect(resend).toBeDisabled();

  const rows = await db.query('select deleted_at from base.booking_otp_challenges');
  expect(rows.rows).toHaveLength(1);
  expect(rows.rows[0].deleted_at).toBeNull();
});

test('after the cooldown a new code replaces the old one and the booking can be completed', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await fillContactForm(page, CONTACT);

  // Pretend the first code was sent two minutes ago.
  await db.query("update base.booking_otp_challenges set created_at = now() - interval '2 minutes'");
  await page.reload();

  await page.getByRole('button', { name: 'Send ny kode', exact: true }).click();
  await expect(page.getByText('Ny kode sendt.')).toBeVisible();

  const rows = await db.query<{ retired: boolean; live: boolean }>(`
    select deleted_at is not null as retired, (deleted_at is null and consumed_at is null) as live
    from base.booking_otp_challenges
    order by id
  `);
  expect(rows.rows).toEqual([
    { retired: true, live: false },
    { retired: false, live: true },
  ]);

  // The new code works on the page the customer is still looking at.
  await submitVerificationCode(page, '111111');
  await expect(page).toHaveURL(/\/overview/);
});
