import { devices } from '@playwright/test';
import type { Pool } from 'pg';
import { expect, test } from '../e2e-booking/fixtures';

/**
 * Sign-in asks for the mobile number or email first. An account with a password gets the password step; a guest
 * from a booking (no password) gets a code, chooses a password and lands on Mine bookinger; an unknown number goes
 * to sign-up with the number filled in. Codes in the e2e stack are always 111111 (non-production profile).
 */

const DEV_CODE = '111111';
const PASSWORD = 'Testpass1234';
let mobileCounter = 0;

/** A fresh, unused Norwegian mobile number per test (9 + six clock digits + a counter digit). */
function uniqueMobile(): string {
  mobileCounter += 1;
  return `9${String(Date.now()).slice(-6)}${mobileCounter % 10}`;
}

const createdUserIds: number[] = [];

/** A customer as a booking leaves them: a verified mobile number, no password, no email, account status GUEST. */
async function createGuest(db: Pool, mobile: string) {
  const user = await db.query<{ id: string }>(
    `insert into base.users (given_name, family_name, provider, account_status, created_via)
     values ('Gjest', 'Kunde', 'LOCAL', 'GUEST', 'PUBLIC_BOOKING') returning id`,
  );
  const id = Number(user.rows[0].id);
  createdUserIds.push(id);
  await db.query(
    `insert into base.user_mobile_number (user_id, mobile_number, verification_status) values ($1, $2, 'VERIFIED')`,
    [id, `+47${mobile}`],
  );
  return id;
}

async function cleanUsers(db: Pool) {
  if (createdUserIds.length === 0) return;
  const ids = createdUserIds.splice(0);
  for (const table of ['sign_in_codes', 'password_reset_tokens', 'refresh_tokens', 'user_mobile_number']) {
    await db.query(`delete from base.${table} where user_id = any($1::bigint[])`, [ids]);
  }
  await db.query('delete from base.users where id = any($1::bigint[])', [ids]);
}

test.afterEach(async ({ db }) => {
  await cleanUsers(db);
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('a guest from a booking gets a code, chooses a password and lands on Mine bookinger', async ({
    page,
    context,
    db,
  }) => {
    const mobile = uniqueMobile();
    const userId = await createGuest(db, mobile);

    await page.goto('/auth/sign-in');
    const fortsett = page.getByRole('button', { name: 'Fortsett', exact: true });
    await expect(fortsett).toBeDisabled();
    await expect(page.getByText('Skriv inn mobilnummer eller e-post', { exact: true })).toBeVisible();
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await fortsett.click();

    await expect(page).toHaveURL(/\/auth\/sign-in\/code$/);
    await expect(page.getByRole('heading', { name: 'Skriv inn koden' })).toBeVisible();
    await expect(page.getByText(/Sendt på SMS til \+47 ••• \d\d/)).toBeVisible();
    // The resend wait counts down; a new code can't be asked for yet.
    await expect(page.getByRole('button', { name: /Send ny kode om \d+ s/ })).toBeDisabled();

    await page.getByLabel('Kode').fill(DEV_CODE);
    await page.getByRole('button', { name: 'Bekreft', exact: true }).click();

    await expect(page).toHaveURL(/\/auth\/sign-in\/new-password$/);
    const save = page.getByRole('button', { name: 'Lagre og logg inn' });
    await page.getByLabel('Nytt passord').fill('kort');
    await expect(save).toBeDisabled();
    await expect(page.getByText('Minst 8 tegn')).toBeVisible();
    await page.getByLabel('Nytt passord').fill(PASSWORD);
    await save.click();

    await expect(page).toHaveURL(/\/booking\/public\/my-appointments$/);
    const stored = await db.query<{ account_status: string; has_password: boolean }>(
      'select account_status, password is not null as has_password from base.users where id = $1',
      [userId],
    );
    expect(stored.rows[0]).toEqual({ account_status: 'GUEST', has_password: true });

    // Next time: number, then password, straight in.
    await context.clearCookies();
    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in\/password$/);
    await expect(page.getByText(mobile)).toBeVisible();
    await page.getByLabel('Passord', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Logg inn', exact: true }).click();
    await expect(page).toHaveURL(/\/booking\/public\/my-appointments$/);
  });

  test('a wrong code says how many tries are left', async ({ page, db }) => {
    const mobile = uniqueMobile();
    await createGuest(db, mobile);

    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in\/code$/);

    await page.getByLabel('Kode').fill('222222');
    await page.getByRole('button', { name: 'Bekreft', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Feil kode. 4 forsøk igjen.' })).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/sign-in\/code$/);
  });

  test('"Glemt passord?" sends a code to an account that has a password', async ({ page, db }) => {
    const mobile = uniqueMobile();
    const userId = await createGuest(db, mobile);
    // bcrypt of "password", the seed's shared test password.
    const seeded = await db.query<{ password: string }>(
      "select password from base.users where email = 'provider@booking.e2e.invalid'",
    );
    await db.query('update base.users set password = $1 where id = $2', [seeded.rows[0].password, userId]);

    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in\/password$/);

    await page.getByRole('button', { name: 'Glemt passord?' }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in\/code$/);
    await expect(page.getByText(/Sendt på SMS til/)).toBeVisible();
  });

  test('"Endre" goes back with the number still filled in', async ({ page, db }) => {
    const mobile = uniqueMobile();
    const userId = await createGuest(db, mobile);
    const seeded = await db.query<{ password: string }>(
      "select password from base.users where email = 'provider@booking.e2e.invalid'",
    );
    await db.query('update base.users set password = $1 where id = $2', [seeded.rows[0].password, userId]);

    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await page.getByRole('link', { name: 'Endre' }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    await expect(page.getByLabel('Mobilnummer eller e-post')).toHaveValue(mobile);
  });

  test('an unknown number goes to sign-up with the number filled in', async ({ page }) => {
    const mobile = uniqueMobile();

    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();

    await expect(page).toHaveURL(/\/auth\/sign-up$/);
    await expect(page.getByLabel('Mobilnummer (valgfritt)')).toHaveValue(mobile);
  });

  test('the old forgot-password page leads to sign-in', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
  });
});

test.describe('phone', () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 5'];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('the guest reaches the code step the same way', async ({ page, db }) => {
    const mobile = uniqueMobile();
    await createGuest(db, mobile);

    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/sign-in\/code$/);
    await expect(page.getByRole('button', { name: 'Bekreft', exact: true })).toBeDisabled();
  });
});
