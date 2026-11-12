import { formatInTimeZone } from 'date-fns-tz';
import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Done appointments (approved sketch 2026-11-12): an appointment whose time is over is Fullført unless it was
 * marked "ikke møtt". Both are greyed in Kalender; Fullført gets a green chip, "ikke møtt" a red bar and chip.
 * The appointment's own page shows a green Fullført line. No backend status: it follows from time + noShow.
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

let accessCookie: string;
let day: string;
let doneId: string;
let noShowId: string;

test.beforeAll(async ({ db, request }) => {
  await seedAppointmentHistory(db);
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));

  // Two days ago at odd minutes, so they never overlap the history seed's whole-hour appointments.
  day = formatInTimeZone(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 'Europe/Oslo', 'yyyy-MM-dd');
  const insert = async (email: string, from: string, to: string, noShow: boolean) => {
    const result = await db.query<{ id: string }>(
      `
        insert into booking.appointments (profile_id, user_id, start_time, end_time, no_show)
        select 1, u.id, ($2 || ' ' || $3)::timestamp at time zone 'Europe/Oslo',
               ($2 || ' ' || $4)::timestamp at time zone 'Europe/Oslo', $5
        from base.users u where u.email = $1
        returning id::text
      `,
      [email, day, from, to, noShow],
    );
    // Service ids 1-4 come from seedBookingFixture; without a service the details (and the name) don't load.
    await db.query(`insert into booking.appointment_services (appointment_id, service_id) values ($1, 1)`, [
      result.rows[0].id,
    ]);
    return result.rows[0].id;
  };
  doneId = await insert('ada.lovelace@company.e2e.invalid', '05:31', '05:41', false);
  noShowId = await insert('grace.hopper@company.e2e.invalid', '05:45', '05:55', true);
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await db.query(`delete from booking.appointments where id = any($1::bigint[])`, [[doneId, noShowId]]);
});

for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: Kalender greys past appointments, Fullført unless ikke møtt, and the page says Fullført`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/booking/schedule?date=${day}`, { waitUntil: 'networkidle' });

    const done = page.getByRole('link', { name: /Ada Lovelace/ }).filter({ hasText: '05:31' });
    const noShow = page.getByRole('link', { name: /Grace Hopper/ }).filter({ hasText: '05:45' });
    await expect(done).toContainText('Fullført');
    await expect(noShow).toContainText('Ikke møtt');
    await expect(noShow).not.toContainText('Fullført');
    // Both greyed (the same past background), so the day reads as done up to now.
    const background = (link: typeof done) => link.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await background(noShow)).toBe(await background(done));
    expect(await background(done)).not.toBe('rgb(255, 255, 255)');

    await done.click();
    await expect(page).toHaveURL(new RegExp(`/company/booking/appointments/${doneId}`));
    const details = page.getByRole('region', { name: 'Avtaledetaljer' });
    await expect(details).toContainText('Fullført');
    await expect(details).not.toContainText('Kommende');

    await page.goto(`${baseURL}/company/booking/appointments/${noShowId}`, { waitUntil: 'networkidle' });
    await expect(details).toContainText('Ikke møtt.');
    await expect(details).not.toContainText('Fullført');
  });
}
