import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * The Booking overview's key destinations (approved sketch B2, 2026-11-10): Kalender and Timebestillinger as
 * full-colour cards with one live number each, above the area rows.
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
  test(`${device}: Kalender and Timebestillinger come first with a number, then the area rows`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });

    const overview = page.getByRole('navigation', { name: 'Booking', exact: true });
    const links = overview.getByRole('link');
    const kalender = links.filter({ hasText: 'Kalender' });
    const timebestillinger = links.filter({ hasText: 'Timebestillinger' });

    // Key cards first, in this order, each with one number ("avtaler", never "timer").
    await expect(links.first()).toContainText('Kalender');
    await expect(links.nth(1)).toContainText('Timebestillinger');
    await expect(kalender).toHaveAttribute('href', '/company/booking/schedule');
    await expect(kalender).toContainText(/\d+\s*avtaler? i dag/);
    await expect(timebestillinger).toHaveAttribute('href', '/company/booking/appointments');
    await expect(timebestillinger).toContainText(/\d+\s*kommende/);
    // The old combined row is gone; the other areas follow as rows.
    await expect(links.filter({ hasText: 'Kalender og timer' })).toHaveCount(0);
    await expect(links.nth(2)).toContainText('Tilgjengelighet');

    await kalender.click();
    await expect(page).toHaveURL(`${baseURL}/company/booking/schedule`);
  });
}
