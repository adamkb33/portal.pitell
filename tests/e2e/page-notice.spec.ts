import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * PageNotice (approved sketch 2026-11-12): when a page can't show its content it shows one centred card. A load error
 * says what failed and offers "Prøv igjen", which reloads the data in place; not-found offers the way back instead.
 * Only not-found is driven here: a 5xx from the backend shows the app-wide problems page instead (root.layout.tsx),
 * and the e2e stack has no recoverable 4xx to make the error card appear.
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
  test(`${device}: not found offers the way back, not a retry`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/booking/appointments/999999999`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Fant ikke timebestillingen')).toBeVisible();
    await expect(page.getByText('Den kan være slettet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prøv igjen' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Til timebestillinger', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/company/booking/appointments`);
  });
}
