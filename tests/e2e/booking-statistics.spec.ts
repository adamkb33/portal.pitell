import type { Pool } from 'pg';
import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Statistikk (Tall), built from the approved sketch on 2026-11-09: a month stepper, one card of stat rows and rows
 * that open Tjenester, Ansatte, Kunder and Bestillingstider for the same month.
 * ui-rules: every screen we build gets an e2e test of its flow.
 *
 * The avtaler sit in February and March 2020, months no other spec touches, so the numbers are exact. Services
 * come from seedBookingFixture: 1 Hårklipp 450 (Klipp), 2 Vask og styling 350 (Styling), 3 Skjeggtrim 300 (Skjegg).
 */

const STATISTICS = `${baseURL}/company/booking/statistics`;
const MARCH = `${STATISTICS}?maned=2020-03`;
const CUSTOMER_DOMAIN = '@statistikk.e2e.invalid';

let accessCookie: string;

test.beforeAll(async ({ request, db }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
  await cleanStatisticsData(db);

  const [anne, bjorn, cecilie, dag] = await Promise.all(
    ['Anne', 'Bjørn', 'Cecilie', 'Dag'].map((name) => customer(db, name)),
  );
  // February: 2 avtaler, 750 kr.
  await visit(db, anne, '2020-02-10T10:00:00+01:00', [1]);
  await visit(db, anne, '2020-02-17T10:00:00+01:00', [3]);
  // March: 3 avtaler (the cancelled one doesn't count), 1 100 kr (the no-show earns nothing), snitt 550 kr.
  await visit(db, anne, '2020-03-02T10:00:00+01:00', [1, 3]);
  await visit(db, bjorn, '2020-03-09T10:00:00+01:00', [2]);
  await visit(db, cecilie, '2020-03-11T11:00:00+01:00', [1], { noShow: true });
  await visit(db, dag, '2020-03-12T12:00:00+01:00', [1], { cancelled: true });
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await cleanStatisticsData(db);
});

test('desktop: overview → Statistikk → a past month → Tjenester keeps the month', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });

  await page.getByRole('link').filter({ hasText: 'Statistikk' }).click();
  await expect(page).toHaveURL(STATISTICS);

  await page.goto(MARCH, { waitUntil: 'networkidle' });
  const month = page.getByRole('navigation', { name: 'Måned' });
  await expect(month).toContainText('Mars 2020');
  await expect(month.getByRole('link', { name: 'Forrige måned' })).toHaveAttribute(
    'href',
    '/company/booking/statistics?maned=2020-02',
  );
  await expect(month.getByRole('link', { name: 'Neste måned' })).toHaveAttribute(
    'href',
    '/company/booking/statistics?maned=2020-04',
  );

  const stats = page.getByRole('region', { name: 'Tall for mars' });
  await expect(stats).toContainText('Omsetning1\u00a0100\u00a0kr47 % høyere enn februar');
  await expect(stats).toContainText('Avtaler350 % flere enn februar');
  await expect(stats).toContainText('Snitt per avtale550\u00a0kr375\u00a0kr i februar');
  // A month that is over has no prognose.
  await expect(stats).not.toContainText('Prognose');

  const details = page.getByRole('navigation', { name: 'Detaljer' });
  await expect(details.getByRole('link', { name: /Kunder/ })).toContainText('3 kunder · 2 nye');
  await expect(details.getByRole('link', { name: /Bestillingstider/ })).toContainText('Travlest mandag kl. 10');

  await details.getByRole('link', { name: /Tjenester/ }).click();
  await expect(page).toHaveURL(`${STATISTICS}/services?maned=2020-03`);
  await expect(page.getByRole('navigation', { name: 'Måned' })).toContainText('Mars 2020');
  const groups = page.getByRole('region', { name: 'Tjenester' }).getByRole('heading', { level: 2 });
  await expect(groups).toHaveText(['Klipp450\u00a0kr', 'Styling350\u00a0kr', 'Skjegg300\u00a0kr']);
  await expect(page.getByRole('region', { name: 'Tjenester' }).getByRole('listitem').first()).toContainText(
    '2 avtaler',
  );

  // Up is the breadcrumb, and it returns to the same month.
  const breadcrumb = page.getByRole('navigation', { name: 'Brødsmuler' });
  await expect(breadcrumb.getByRole('link', { name: 'Statistikk' })).toHaveAttribute(
    'href',
    '/company/booking/statistics?maned=2020-03',
  );
  await breadcrumb.getByRole('link', { name: 'Statistikk' }).click();
  await expect(page).toHaveURL(MARCH);
});

test('phone: this month has a prognose, › is off, and ‹ in the header keeps the month picked on a detail page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(STATISTICS, { waitUntil: 'networkidle' });

  await expect(page.getByRole('link', { name: 'Tilbake til Booking' })).toHaveAttribute('href', '/company/booking');
  await expect(page.getByRole('region', { name: /^Tall for / })).toContainText('Prognose');
  const month = page.getByRole('navigation', { name: 'Måned' });
  await expect(month.getByRole('link', { name: 'Neste måned' })).toHaveCount(0);

  await page.goto(`${STATISTICS}/booking-times?maned=2020-03`, { waitUntil: 'networkidle' });
  const calendar = page.getByRole('table', { name: 'Avtaler per dag i mars' });
  await expect(calendar.getByRole('columnheader')).toHaveText(['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn']);
  // 1 March 2020 is a Sunday, so the first week has six empty days before it.
  await expect(calendar.getByRole('row').nth(1).getByRole('cell').nth(6)).toContainText(
    'søndag 1. mars: ingen avtaler',
  );
  await expect(calendar.getByRole('cell', { name: 'mandag 2. mars: 1 avtale', exact: true })).toBeVisible();
  // The cancelled avtale on 12 March doesn't count.
  await expect(calendar.getByRole('cell', { name: 'torsdag 12. mars: ingen avtaler', exact: true })).toBeVisible();
  await expect(page.getByText('Booket')).toHaveCount(0);
  const busiest = page.getByRole('region', { name: 'Travleste tider' }).getByRole('listitem').first();
  await expect(busiest).toContainText('Mandag kl. 10');
  await expect(busiest).toContainText('2 avtaler');

  // Step to February on the detail page; the header's ‹ follows.
  await page.getByRole('navigation', { name: 'Måned' }).getByRole('link', { name: 'Forrige måned' }).click();
  await expect(page).toHaveURL(`${STATISTICS}/booking-times?maned=2020-02`);
  const up = page.getByRole('link', { name: 'Tilbake til Statistikk' });
  await expect(up).toHaveAttribute('href', '/company/booking/statistics?maned=2020-02');
  await up.click();
  await expect(page).toHaveURL(`${STATISTICS}?maned=2020-02`);
  await expect(page.getByRole('region', { name: 'Tall for februar' })).toContainText('Avtaler2');

  await page.getByRole('link', { name: /Ansatte/ }).click();
  await expect(page).toHaveURL(`${STATISTICS}/profiles?maned=2020-02`);
  const provider = page.getByRole('region', { name: 'Ansatte' }).getByRole('listitem');
  await expect(provider).toHaveCount(1);
  await expect(provider).toContainText('2 avtaler');
  await expect(provider).toContainText('750\u00a0kr');
});

async function customer(db: Pool, givenName: string) {
  const result = await db.query<{ id: string }>(
    `
      insert into base.users (given_name, family_name, email, provider, email_verified_at)
      values ($1::text, 'Statistikk', $2::text, 'LOCAL', now())
      returning id
    `,
    [givenName, `${givenName.toLowerCase()}${Date.now()}${CUSTOMER_DOMAIN}`],
  );
  return Number(result.rows[0].id);
}

async function visit(
  db: Pool,
  customerId: number,
  start: string,
  serviceIds: number[],
  options: { noShow?: boolean; cancelled?: boolean } = {},
) {
  const appointment = await db.query<{ id: string }>(
    `
      insert into booking.appointments (profile_id, user_id, start_time, end_time, no_show, cancelled_at)
      values (1, $1, $2::timestamptz, $2::timestamptz + interval '30 minutes', $3, case when $4 then now() end)
      returning id
    `,
    [customerId, start, options.noShow ?? false, options.cancelled ?? false],
  );
  for (const serviceId of serviceIds) {
    await db.query('insert into booking.appointment_services (appointment_id, service_id) values ($1, $2)', [
      appointment.rows[0].id,
      serviceId,
    ]);
  }
}

async function cleanStatisticsData(db: Pool) {
  const customers = `select id from base.users where email like '%${CUSTOMER_DOMAIN}'`;
  await db.query(
    `delete from booking.appointment_services where appointment_id in (select id from booking.appointments where user_id in (${customers}))`,
  );
  await db.query(`delete from booking.appointments where user_id in (${customers})`);
  await db.query(`delete from base.users where email like '%${CUSTOMER_DOMAIN}'`);
}
