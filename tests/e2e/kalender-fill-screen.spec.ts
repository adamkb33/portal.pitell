import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Kalender fills the screen (approved sketch B, 2026-11-12): the week strip and the day stay put, only the rows
 * scroll, and today opens on "Nå" (or "Neste") instead of the day's first appointment. The page itself doesn't scroll.
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

const HALF_HOUR = 30 * 60 * 1000;
const COUNT = 12;
/** Index of the appointment that starts now, so it is "Nå" when the page loads. */
const NOW_INDEX = 8;
let accessCookie: string;
let ids: string[] = [];

// Twelve half-hour slots from four hours ago: they must all fall on today in Oslo, so skip near midnight.
const osloHour = Number(new Intl.DateTimeFormat('nb-NO', { hour: 'numeric', timeZone: 'Europe/Oslo' }).format());
test.skip(osloHour < 5 || osloHour >= 21, 'Needs four hours before and two after now within today');

test.beforeAll(async ({ db, request }) => {
  await seedAppointmentHistory(db);
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));

  const start = Date.now() - NOW_INDEX * HALF_HOUR;
  for (let i = 0; i < COUNT; i++) {
    const result = await db.query<{ id: string }>(
      `
        insert into booking.appointments (profile_id, user_id, start_time, end_time)
        select 1, u.id, $1::timestamptz, $1::timestamptz + interval '25 minutes'
        from base.users u where u.email = 'ada.lovelace@company.e2e.invalid'
        returning id::text
      `,
      [new Date(start + i * HALF_HOUR).toISOString()],
    );
    ids.push(result.rows[0].id);
    await db.query(`insert into booking.appointment_services (appointment_id, service_id) values ($1, 1)`, [
      result.rows[0].id,
    ]);
  }
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await db.query(`delete from booking.appointments where id = any($1::bigint[])`, [ids]);
  ids = [];
});

for (const [device, width, height] of [
  ['desktop', 1440, 900],
  ['phone', 375, 812],
] as const) {
  test(`${device}: the card fills the screen, only the rows scroll, and today opens on Nå`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`${baseURL}/company/booking/schedule`, { waitUntil: 'networkidle' });

    // No page scroll: everything fits, the rows scroll inside the card.
    const pageScrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
    expect(pageScrolls).toBe(false);
    const rows = page.getByTestId('kalender-rows');
    expect(await rows.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    // Opened on "Nå": it is in view, the day's first appointment is scrolled away, the week strip stays.
    const list = rows.getByRole('listitem');
    await expect(list.nth(NOW_INDEX)).toHaveAttribute('data-marker', 'now');
    await expect(list.nth(NOW_INDEX)).toBeInViewport();
    expect(await rows.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(list.first()).not.toBeInViewport();
    await expect(page.getByRole('group', { name: 'Velg dag' })).toBeInViewport();

    // The create button (phone) and "Bookbar tid eller fravær" stay visible below the card.
    await expect(page.getByRole('button', { name: 'Bookbar tid eller fravær' })).toBeInViewport();
  });
}
