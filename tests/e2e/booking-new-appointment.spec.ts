import type { Pool } from 'pg';
import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Ny time for a customer (Kunde → Tjenester → Tid), built from the approved sketch on 2026-11-09.
 * ui-rules: every screen we build gets an e2e test of its flow.
 *
 * Customers come from seedAppointmentHistory (Ada Lovelace, Grace Hopper, Alan Turing), services from
 * seedBookingFixture (Hårklipp 450 kr, 20 min, in Klipp).
 */

const SCHEDULE = `${baseURL}/company/booking/schedule`;
const CREATE = `${baseURL}/company/booking/appointments/create`;
let accessCookie: string;

test.beforeAll(async ({ request, db }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
  await seedAppointmentHistory(db);
  await removeUpcomingAppointmentsFor(db, 'grace.hopper@company.e2e.invalid');
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await removeUpcomingAppointmentsFor(db, 'grace.hopper@company.e2e.invalid');
});

test('phone: Bestill ny avtale in Kalender → customer → service → first free time → back in Kalender on that day', async ({
  page,
  db,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(SCHEDULE, { waitUntil: 'networkidle' });

  await page.getByRole('link', { name: 'Bestill ny avtale', exact: true }).click();
  await expect(page).toHaveURL(`${CREATE}?fra=kalender`);
  // Started from Kalender, so up goes back there, not to Timebestillinger.
  await expect(page.getByRole('link', { name: 'Tilbake til Kalender', exact: true })).toHaveAttribute(
    'href',
    '/company/booking/schedule',
  );
  await expect(page.getByText('1 av 3', { exact: true })).toBeVisible();

  // Step 1: a short list of the newest customers, and search for the rest.
  await expect(page.getByRole('heading', { name: 'Nyeste kunder' })).toBeVisible();
  expect(await page.getByRole('list').first().getByRole('listitem').count()).toBeLessThanOrEqual(5);
  await page.getByRole('textbox', { name: 'Søk etter kunde' }).fill('Grace');
  await expect(page.getByRole('heading', { name: 'Treff på «Grace»' })).toBeVisible();
  await page.getByRole('button', { name: /Grace Hopper/ }).click();

  // Step 2: services in their groups; the bar sums them up.
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Valgt' })).toContainText('Grace Hopper');
  await expect(page.getByRole('heading', { name: /^Klipp/ })).toBeVisible();
  // The customer flow's rows: tap to choose, then − n + to book it more than once.
  await page.getByRole('checkbox', { name: /^Hårklipp/ }).click();
  await page.getByRole('group', { name: 'Antall Hårklipp' }).getByRole('button', { name: 'Flere' }).click();
  await expect(page.getByText('2 valgt · 40 min · 900\u00a0kr')).toBeVisible();
  await page.getByRole('button', { name: 'Velg tid', exact: true }).click();

  // Step 3: the first free time, then create.
  await expect(page.getByText('3 av 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Første ledige tid/ }).click();
  // Picking a time folds the picker away: an overview of the booking with a green Book button.
  await expect(page.getByRole('heading', { name: 'Oversikt', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Første ledige tid/ })).toHaveCount(0);
  await expect(page.getByText('Grace Hopper')).toBeVisible();
  await expect(page.getByText('2 × Hårklipp')).toBeVisible();
  await expect(page.getByText('900\u00a0kr')).toBeVisible();
  await page.getByRole('button', { name: 'Endre tid' }).click();
  await expect(page.getByRole('button', { name: /Første ledige tid/ })).toBeVisible();
  await page.getByRole('button', { name: /Første ledige tid/ }).click();
  await page.getByRole('button', { name: 'Book time', exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`^${SCHEDULE}\\?date=\\d{4}-\\d{2}-\\d{2}$`));
  // Booked twice in one appointment: one service line with quantity 2.
  const saved = await db.query<{ quantity: number }>(
    `select aps.quantity from booking.appointment_services aps
     join booking.appointments a on a.id = aps.appointment_id
     join base.users u on u.id = a.user_id
     where u.email = 'grace.hopper@company.e2e.invalid' and a.start_time > now()`,
  );
  expect(saved.rows.map((row) => row.quantity)).toEqual([2]);
  await expect(page.getByRole('status').first()).toBeVisible();
});

test('desktop: Bestill ny avtale in Timebestillinger keeps Timebestillinger as the way up', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/company/booking/appointments`, { waitUntil: 'networkidle' });

  await page.getByRole('link', { name: 'Bestill ny avtale', exact: true }).first().click();
  await expect(page).toHaveURL(CREATE);
  const breadcrumb = page.getByRole('navigation', { name: 'Brødsmuler' });
  await expect(breadcrumb.getByRole('link', { name: 'Timebestillinger', exact: true })).toHaveAttribute(
    'href',
    '/company/booking/appointments',
  );
  await expect(breadcrumb.getByRole('link', { name: 'Kalender', exact: true })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Oppsummering' })).toContainText('Ikke valgt');
});

async function removeUpcomingAppointmentsFor(db: Pool, email: string) {
  const appointments = `
    select a.id from booking.appointments a join base.users u on u.id = a.user_id
    where u.email = $1 and a.start_time > now()
  `;
  await db.query(`delete from booking.appointment_services where appointment_id in (${appointments})`, [email]);
  await db.query(`delete from booking.appointments where id in (${appointments})`, [email]);
}
