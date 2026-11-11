import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * The company Oversikt (approved sketch 2026-11-11): two key cards with one live number (Kalender today, unread
 * Varsler), one row per area the user can open, and the company as one row with "Endre".
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

let accessCookie: string;

test.beforeAll(async ({ db, request }) => {
  await seedAppointmentHistory(db);
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: key cards, area rows and the company lead where they say`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company`, { waitUntil: 'networkidle' });

    // Key cards: each opens its page and carries one number.
    const kalender = page.getByRole('link', { name: /^Kalender/ });
    await expect(kalender).toHaveAttribute('href', '/company/booking/schedule');
    await expect(kalender).toContainText(/\d+\s*avtaler? i dag/);
    const varsler = page.getByRole('link', { name: /^Varsler/ }).filter({ hasText: /ulest/ });
    await expect(varsler).toHaveAttribute('href', '/company/notifications');

    // One row per area the e2e company has (Booking and Timelister), in their fixed order.
    const areas = page.getByRole('navigation', { name: 'Områder' }).getByRole('link');
    await expect(areas.first()).toContainText('Booking');
    await expect(areas.filter({ hasText: 'Booking' })).toContainText(/\d+ kommende avtaler?/);
    await expect(areas.filter({ hasText: 'Timelister' })).toHaveAttribute('href', '/company/timesheets');

    // The company: name, org.nr as Brønnøysund writes it, and "Endre" to the settings.
    const company = page.getByRole('region', { name: 'Selskap' });
    await expect(company).toContainText('Org.nr 927 491 745');
    await expect(company.getByRole('link', { name: 'Endre selskapet' })).toHaveAttribute(
      'href',
      '/company/admin/settings',
    );

    // None of the old registry tiles.
    await expect(page.getByText('Registrerte felt')).toHaveCount(0);

    await areas.filter({ hasText: 'Booking' }).click();
    await expect(page).toHaveURL(`${baseURL}/company/booking`);
  });
}
