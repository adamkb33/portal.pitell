import { devices, type Page } from '@playwright/test';
import type { Pool } from 'pg';
import { expect, test } from '../e2e-booking/fixtures';

/**
 * Sign-up and the steps around it. An unknown number from sign-in lands on Opprett konto with the number filled in;
 * the mobile number is required and the email optional; Opprett konto stays disabled until the form is filled in.
 * The number is then checked with the same code step as sign-in, and a customer lands on Mine bookinger. Accounts
 * missing a mobile number or an email get "Legg til mobilnummer" / "Legg til e-post". SMS codes in the e2e stack are
 * always 111111 (non-production profile).
 */

const DEV_CODE = '111111';
const PASSWORD = 'Testpass1234';
let counter = 0;

/** A fresh, unused Norwegian mobile number per test (4 + six clock digits + a counter digit). */
function uniqueMobile(): string {
  counter += 1;
  return `4${String(Date.now()).slice(-6)}${counter % 10}`;
}

function uniqueEmail(): string {
  counter += 1;
  return `signup-${Date.now()}-${counter}@e2e.invalid`;
}

const createdUserIds: number[] = [];

async function trackUserByMobile(db: Pool, mobile: string) {
  const row = await db.query<{ user_id: string }>(
    'select user_id from base.user_mobile_number where mobile_number = $1',
    [`+47${mobile}`],
  );
  if (row.rows[0]) createdUserIds.push(Number(row.rows[0].user_id));
  return row.rows[0] ? Number(row.rows[0].user_id) : null;
}

/** bcrypt of "password", the seed's shared test password. */
async function seededPasswordHash(db: Pool) {
  const seeded = await db.query<{ password: string }>(
    "select password from base.users where email = 'provider@booking.e2e.invalid'",
  );
  return seeded.rows[0].password;
}

async function createUser(db: Pool, { email, mobile }: { email: string | null; mobile: string | null }) {
  const user = await db.query<{ id: string }>(
    `insert into base.users (given_name, family_name, email, password, provider, account_status, created_via)
     values ('Kari', 'Nordmann', $1, $2, 'LOCAL', 'FULL', 'SIGN_UP') returning id`,
    [email, await seededPasswordHash(db)],
  );
  const id = Number(user.rows[0].id);
  createdUserIds.push(id);
  if (mobile) {
    await db.query(
      `insert into base.user_mobile_number (user_id, mobile_number, verification_status) values ($1, $2, 'VERIFIED')`,
      [id, `+47${mobile}`],
    );
  }
  return id;
}

async function cleanUsers(db: Pool) {
  if (createdUserIds.length === 0) return;
  const ids = createdUserIds.splice(0);
  for (const table of [
    'sign_in_codes',
    'password_reset_tokens',
    'refresh_tokens',
    'email_verification_tokens',
    'mobile_verification_otps',
    'signup_verification_sessions',
    'user_roles',
    'user_mobile_number',
  ]) {
    await db.query(`delete from base.${table} where user_id = any($1::bigint[])`, [ids]);
  }
  await db.query('delete from base.users where id = any($1::bigint[])', [ids]);
}

test.afterEach(async ({ db }) => {
  await cleanUsers(db);
});

/** Number or email, then Fortsett, then the password step. */
async function signInWithPassword(page: Page, identifier: string, password: string) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Mobilnummer eller e-post').fill(identifier);
  await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\/password$/);
  await page.getByLabel('Passord', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click();
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('an unknown number signs up, gets a code and lands on Mine bookinger', async ({ page, db }) => {
    const mobile = uniqueMobile();

    await page.goto('/auth/sign-in');
    await page.getByLabel('Mobilnummer eller e-post').fill(mobile);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();

    await expect(page).toHaveURL(/\/auth\/sign-up$/);
    await expect(page.getByRole('heading', { name: 'Opprett konto' })).toBeVisible();
    await expect(page.getByLabel('Mobilnummer', { exact: true })).toHaveValue(mobile);
    const create = page.getByRole('button', { name: 'Opprett konto', exact: true });
    await expect(create).toBeDisabled();
    await expect(page.getByText('Skriv inn fornavn', { exact: true })).toBeVisible();

    await page.getByLabel('Fornavn').fill('Ola');
    await page.getByLabel('Etternavn').fill('Nordmann');
    await page.getByLabel('Passord', { exact: true }).fill('kort');
    await expect(page.getByText('Passordet må ha minst 8 tegn', { exact: true })).toBeVisible();
    await expect(create).toBeDisabled();
    await page.getByLabel('Passord', { exact: true }).fill(PASSWORD);
    await expect(create).toBeEnabled();
    await create.click();

    await expect(page).toHaveURL(/\/auth\/verify-mobile$/);
    await expect(page.getByRole('heading', { name: 'Skriv inn koden' })).toBeVisible();
    await expect(page.getByText(`Sendt på SMS til +47 ••• ${mobile.slice(-2)}`)).toBeVisible();
    const confirm = page.getByRole('button', { name: 'Bekreft', exact: true });
    await expect(confirm).toBeDisabled();
    await page.getByLabel('Kode').fill(DEV_CODE);
    await confirm.click();

    await expect(page).toHaveURL(/\/booking\/public\/my-appointments$/);
    const userId = await trackUserByMobile(db, mobile);
    const stored = await db.query<{ verification_status: string; email: string | null }>(
      `select m.verification_status, u.email from base.user_mobile_number m join base.users u on u.id = m.user_id
       where m.user_id = $1`,
      [userId],
    );
    expect(stored.rows[0]).toEqual({ verification_status: 'VERIFIED', email: null });
  });

  test('a wrong code says so and stays on the code step', async ({ page, db }) => {
    const mobile = uniqueMobile();

    await page.goto('/auth/sign-up');
    await page.getByLabel('Fornavn').fill('Ola');
    await page.getByLabel('Etternavn').fill('Nordmann');
    await page.getByLabel('Mobilnummer', { exact: true }).fill(mobile);
    await page.getByLabel('Passord', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Opprett konto', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/verify-mobile$/);
    await trackUserByMobile(db, mobile);

    await page.getByLabel('Kode').fill('222222');
    await page.getByRole('button', { name: 'Bekreft', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Feil kode. Prøv igjen.' })).toBeVisible();
    // Still the code step (React Router keeps ?index on a page with a layout after a form that stays put).
    await expect(page).toHaveURL(/\/auth\/verify-mobile(\?index)?$/);
    await expect(page.getByRole('heading', { name: 'Skriv inn koden' })).toBeVisible();
  });

  test('an account without a mobile number adds one and checks it with a code', async ({ page, db }) => {
    const email = uniqueEmail();
    const mobile = uniqueMobile();
    const userId = await createUser(db, { email, mobile: null });
    await db.query('update base.users set email_verified_at = now() where id = $1', [userId]);

    await signInWithPassword(page, email, 'password');

    await expect(page).toHaveURL(/\/auth\/collect-mobile$/);
    await expect(page.getByRole('heading', { name: 'Legg til mobilnummer' })).toBeVisible();
    const next = page.getByRole('button', { name: 'Fortsett', exact: true });
    await expect(next).toBeDisabled();
    await expect(page.getByText('Skriv inn mobilnummer', { exact: true })).toBeVisible();
    await page.getByLabel('Mobilnummer', { exact: true }).fill(mobile);
    await next.click();

    await expect(page).toHaveURL(/\/auth\/verify-mobile$/);
    await expect(page.getByText(`Sendt på SMS til +47 ••• ${mobile.slice(-2)}`)).toBeVisible();
    await page.getByLabel('Kode').fill(DEV_CODE);
    await page.getByRole('button', { name: 'Bekreft', exact: true }).click();
    await expect(page).not.toHaveURL(/\/auth\//);
  });

  test('an account without an email adds one', async ({ page, db }) => {
    const mobile = uniqueMobile();
    const email = uniqueEmail();
    const userId = await createUser(db, { email: null, mobile });

    await signInWithPassword(page, mobile, 'password');

    await expect(page).toHaveURL(/\/auth\/collect-email$/);
    await expect(page.getByRole('heading', { name: 'Legg til e-post' })).toBeVisible();
    const next = page.getByRole('button', { name: 'Fortsett', exact: true });
    await page.getByLabel('E-post', { exact: true }).fill('kari@');
    await expect(page.getByText('Skriv inn en gyldig e-postadresse', { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
    await page.getByLabel('E-post', { exact: true }).fill(email);
    await next.click();

    await expect(page).not.toHaveURL(/\/auth\/collect-email/);
    const stored = await db.query<{ email: string }>('select email from base.users where id = $1', [userId]);
    expect(stored.rows[0].email).toBe(email);
  });

  test('signed out, Legg til mobilnummer and Legg til e-post lead to sign-in', async ({ page }) => {
    for (const path of ['/auth/collect-mobile', '/auth/collect-email']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/sign-in$/);
    }
  });
});

/**
 * Complete-profile used to trust a user id in the body with no sign-in, so anyone could put their own number on
 * another account, get its code and sign in as it. It now acts only on the signed-in account.
 */
test.describe('complete-profile without sign-in', () => {
  test('is refused and leaves the account as it was', async ({ request, db }) => {
    const victimMobile = uniqueMobile();
    const victimId = await createUser(db, { email: uniqueEmail(), mobile: victimMobile });
    const url = `${process.env.E2E_GATEWAY_URL}/base-service/auth/provider/complete-profile`;

    for (const data of [{ userId: victimId, mobileNumber: uniqueMobile() }, { mobileNumber: uniqueMobile() }]) {
      const response = await request.post(url, { data });
      expect(response.status()).toBe(403);
    }

    const stored = await db.query<{ mobile_number: string; verification_status: string }>(
      'select mobile_number, verification_status from base.user_mobile_number where user_id = $1',
      [victimId],
    );
    expect(stored.rows).toEqual([{ mobile_number: `+47${victimMobile}`, verification_status: 'VERIFIED' }]);
    const sessions = await db.query('select 1 from base.signup_verification_sessions where user_id = $1', [victimId]);
    expect(sessions.rowCount).toBe(0);
  });
});

test.describe('phone', () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 5'];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('Opprett konto is disabled until the form is filled in', async ({ page }) => {
    await page.goto('/auth/sign-up');
    const create = page.getByRole('button', { name: 'Opprett konto', exact: true });
    await expect(create).toBeDisabled();
    await page.getByLabel('Fornavn').fill('Ola');
    await page.getByLabel('Etternavn').fill('Nordmann');
    await expect(page.getByText('Skriv inn mobilnummer', { exact: true })).toBeVisible();
    await page.getByLabel('Mobilnummer', { exact: true }).fill(uniqueMobile());
    await page.getByLabel('Passord', { exact: true }).fill(PASSWORD);
    await expect(create).toBeEnabled();
  });
});
