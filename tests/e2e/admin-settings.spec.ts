import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Innstillinger (approved sketch 2026-11-14): the company name, the org.nr as read-only info, Lagre disabled while the
 * name is empty, and "Selskapsnavn lagret" back on Administrasjon. No "Innlogget administrator".
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

let accessCookie: string;

test.beforeAll(async ({ request }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: rename the company from Administrasjon and back`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Endre selskapet' }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/settings`);

    if (device === 'phone') {
      await expect(page.getByRole('link', { name: 'Tilbake til Administrasjon', exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeHidden();
    }
    await expect(page.getByText(/Organisasjonsnummer/)).toBeVisible();
    await expect(page.getByText(/\d{3} \d{3} \d{3}/)).toBeVisible();
    await expect(page.getByText(/Innlogget/)).toHaveCount(0);

    const field = page.getByRole('textbox', { name: 'Selskapsnavn' });
    const original = await field.inputValue();
    const lagre = page.getByRole('button', { name: 'Lagre', exact: true });

    // Lagre waits for a name (ui-rules, rule 5).
    await field.fill('');
    await expect(lagre).toBeDisabled();
    await expect(page.getByText('Skriv inn selskapsnavn', { exact: true })).toBeVisible();

    const renamed = `E2E Salong ${device}`;
    await field.fill(renamed);
    await lagre.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin`);
    await expect(page.getByRole('status').filter({ hasText: 'Selskapsnavn lagret' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Administrasjon', exact: true })).toContainText(renamed);

    // Put the name back so other tests see the company as seeded.
    await page.getByRole('link', { name: 'Endre selskapet' }).click();
    await field.fill(original);
    await lagre.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin`);
    await expect(page.getByRole('navigation', { name: 'Administrasjon', exact: true })).toContainText(original);
  });
}
