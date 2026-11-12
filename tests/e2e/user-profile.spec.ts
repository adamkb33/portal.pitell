import { expect, test } from '../e2e-booking/fixtures';
import { e2eAdmin, frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Min profil (approved sketch 2026-11-12): an Oversikt of who you are (name, e-post and mobil with Bekreftet chips) and
 * a Passord row whose "Endre" opens Endre passord, a form page with the Lagre bar. Saving returns to Min profil with
 * the toast "Passord endret". The admin's stored password is put back afterwards so the other specs can sign in.
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

const NEW_PASSWORD = 'Nytt-e2e-passord-42';
let accessCookie: string;
let storedPassword: string;

test.beforeAll(async ({ db, request }) => {
  const row = await db.query<{ password: string }>(`select password from base.users where email = $1`, [
    e2eAdmin.email,
  ]);
  storedPassword = row.rows[0].password;
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await db.query(`update base.users set password = $2 where email = $1`, [e2eAdmin.email, storedPassword]);
});

test('desktop: Min profil shows who you are; Endre passord saves and comes back with a toast', async ({ page, db }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/user/profile`, { waitUntil: 'networkidle' });

  const profile = page.getByRole('region', { name: 'Min profil' });
  await expect(profile.getByRole('heading', { level: 2 })).toHaveText('E2E Behandler');
  await expect(profile.getByRole('heading', { name: 'Kontakt' })).toBeVisible();
  await expect(profile).toContainText(e2eAdmin.email);
  await expect(profile).toContainText('+4799990001');
  await expect(profile.getByText('Bekreftet', { exact: true })).toHaveCount(2);
  // The old page's description and form are gone: the password has its own page.
  await expect(page.getByText('Profilinformasjon og passordhåndtering.')).toHaveCount(0);
  await expect(page.getByLabel('Nåværende passord')).toHaveCount(0);

  await profile.getByRole('link', { name: 'Endre passord' }).click();
  await expect(page).toHaveURL(`${baseURL}/user/profile/passord`);
  await expect(page.getByRole('navigation', { name: 'Brødsmuler' })).toContainText('Min profil');

  // Field errors sit under their field.
  await page.getByLabel('Nåværende passord').fill(e2eAdmin.password);
  await page.getByLabel('Nytt passord', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Gjenta nytt passord').fill('noe annet');
  await page.getByRole('button', { name: 'Lagre' }).click();
  await expect(page.getByText('Passordene er ikke like')).toBeVisible();
  await expect(page).toHaveURL(`${baseURL}/user/profile/passord`);

  // A wrong current password is the backend's call: an error toast, and you stay on the form.
  await page.getByLabel('Nåværende passord').fill('feil-passord');
  await page.getByLabel('Gjenta nytt passord').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Lagre' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page).toHaveURL(`${baseURL}/user/profile/passord`);

  await page.getByLabel('Nåværende passord').fill(e2eAdmin.password);
  await page.getByLabel('Nytt passord', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Gjenta nytt passord').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Lagre' }).click();
  await expect(page).toHaveURL(`${baseURL}/user/profile`);
  await expect(page.getByRole('status').filter({ hasText: 'Passord endret' })).toBeVisible();

  const after = await db.query<{ password: string }>(`select password from base.users where email = $1`, [
    e2eAdmin.email,
  ]);
  expect(after.rows[0].password).not.toBe(storedPassword);
});

test('phone: ≡ on Min profil; Endre passord has ‹ back, no bottom menu and the Lagre bar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/user/profile`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Åpne meny' })).toBeVisible();

  await page.getByRole('link', { name: 'Endre passord' }).click();
  await expect(page).toHaveURL(`${baseURL}/user/profile/passord`);
  await expect(page.getByRole('button', { name: 'Lagre' })).toBeInViewport();
  await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Tilbake til Min profil' }).click();
  await expect(page).toHaveURL(`${baseURL}/user/profile`);
});
