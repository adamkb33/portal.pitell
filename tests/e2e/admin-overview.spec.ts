import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Administrasjon (approved sketch 2026-11-13): Ansatte and Kontakter as key cards with one number, then the company
 * with "Endre" and Statistikk as rows. ui-rules: every screen we build gets an e2e test of its flow.
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
  test(`${device}: key cards and rows lead where they say`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });

    const ansatte = page.getByRole('link', { name: /^Ansatte/ });
    await expect(ansatte).toHaveAttribute('href', '/company/admin/employees');
    await expect(ansatte).toContainText(/\d+\s*ansatte?\b/);
    const kontakter = page.getByRole('link', { name: /^Kontakter/ });
    await expect(kontakter).toHaveAttribute('href', '/company/admin/contacts');
    await expect(kontakter).toContainText(/\d+\s*kontakt(er)?\b/);

    const rows = page.getByRole('navigation', { name: 'Administrasjon', exact: true });
    await expect(rows).toContainText(/Org\.nr \d{3} \d{3} \d{3}/);
    await expect(rows.getByRole('link', { name: 'Endre selskapet' })).toHaveAttribute(
      'href',
      '/company/admin/settings',
    );
    const statistikk = rows.getByRole('link', { name: /^Statistikk/ });
    await expect(statistikk).toContainText(/\d+ å følge opp|Tilgang og kontakter/);

    // No create button on an Oversikt page, and the old tiles' descriptions are gone.
    await expect(page.getByText('Administrer ansatte og invitasjoner')).toHaveCount(0);
    if (device === 'phone') await expect(page.getByRole('button', { name: 'Åpne meny', exact: true })).toBeVisible();

    await kontakter.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts`);
  });
}
