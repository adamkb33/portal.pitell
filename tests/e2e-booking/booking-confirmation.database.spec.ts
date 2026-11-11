import type { Page } from '@playwright/test';
import { acceptTerms, completeGuestContact, selectBookingDetails } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

async function reachOverview(page: Page, mobileNumber: string) {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, { givenName: 'Confirm', familyName: 'Once', mobileNumber });
}

async function appointmentCount(db: import('pg').Pool) {
  const result = await db.query<{ count: string }>('select count(*)::text as count from booking.appointments');
  return Number(result.rows[0].count);
}

test('double-clicking "Bekreft timebestilling" creates exactly one appointment', async ({ page, db }) => {
  await reachOverview(page, '90000071');

  await acceptTerms(page);

  await page.getByRole('button', { name: /Bekreft timebestilling/ }).dblclick();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  expect(await appointmentCount(db)).toBe(1);
  const services = await db.query<{ count: string }>('select count(*)::text as count from booking.appointment_services');
  expect(services.rows[0].count).toBe('1');
});

test('going back after confirming and confirming again does not create a second appointment', async ({ page, db }) => {
  await reachOverview(page, '90000072');
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  await page.goBack();
  const confirm = page.getByRole('button', { name: /Bekreft timebestilling/ });
  // Depending on how stale the page is, the confirm button is gone or the click is refused. Either way, nothing new.
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => undefined);
  }
  await page.waitForLoadState('networkidle');

  expect(await appointmentCount(db)).toBe(1);
});

test('reloading the success page keeps showing the appointment and creates nothing', async ({ page, db }) => {
  await reachOverview(page, '90000073');
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  await page.reload();

  await expect(page.getByText('Hårklipp').first()).toBeVisible();
  expect(await appointmentCount(db)).toBe(1);
});

test('the calendar file starts at the same moment the appointment is stored', async ({ page, db }) => {
  await reachOverview(page, '90000074');
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

  const href = await page.getByRole('link', { name: /Legg til i kalender/ }).getAttribute('href');
  const body = decodeURIComponent(href!.split(',').slice(1).join(','));
  const dtstart = body.match(/DTSTART(?:;[^:]*)?:(\d{8}T\d{6})(Z?)/);
  expect(dtstart).not.toBeNull();

  const stored = await db.query<{ start_utc: string; start_oslo: string }>(`
    select to_char(start_time at time zone 'UTC', 'YYYYMMDD"T"HH24MISS') as start_utc,
           to_char(start_time at time zone 'Europe/Oslo', 'YYYYMMDD"T"HH24MISS') as start_oslo
    from booking.appointments
  `);
  // A trailing Z means UTC; a floating time means Oslo wall-clock. Both must name the stored instant.
  const expected = dtstart![2] === 'Z' ? stored.rows[0].start_utc : stored.rows[0].start_oslo;
  expect(dtstart![1]).toBe(expected);
});

test.describe('my appointments', () => {
  async function book(page: Page, mobileNumber: string) {
    await reachOverview(page, mobileNumber);
    await acceptTerms(page);
    await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
    await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
    return Number(new URL(page.url()).searchParams.get('appointmentId'));
  }

  test('an upcoming appointment is shown as the next one and can be cancelled from the list', async ({ page, db }) => {
    const id = await book(page, '90000075');
    await db.query(
      "update booking.appointments set start_time = now() + interval '7 days', end_time = now() + interval '7 days 20 minutes' where id = $1",
      [id],
    );

    await page.goto('/booking/public/my-appointments');

    await expect(page.getByRole('region', { name: 'Din neste time' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Avbestill' })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Ingen planlagte timer' })).toHaveCount(0);
  });

  test('once the appointment is in the past there is no next time and nothing to cancel', async ({ page, db }) => {
    const id = await book(page, '90000076');
    await db.query(
      "update booking.appointments set start_time = now() - interval '2 days', end_time = now() - interval '2 days' + interval '20 minutes' where id = $1",
      [id],
    );

    await page.goto('/booking/public/my-appointments');

    await expect(page.getByRole('heading', { name: 'Ingen planlagte timer' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Din neste time' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Avbestill' })).toHaveCount(0);
  });

  test('a cancelled appointment no longer counts as upcoming', async ({ page, db }) => {
    const id = await book(page, '90000077');
    await db.query(
      "update booking.appointments set start_time = now() + interval '7 days', end_time = now() + interval '7 days 20 minutes', cancelled_at = now() where id = $1",
      [id],
    );

    await page.goto('/booking/public/my-appointments');

    await expect(page.getByRole('region', { name: 'Din neste time' })).toHaveCount(0);
  });
});

test.describe('desktop customer', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('a customer on a desktop browser can complete a booking', async ({ page, db }) => {
    await selectBookingDetails(page, ['Hårklipp']);
    await completeGuestContact(page, { givenName: 'Desk', familyName: 'Top', mobileNumber: '90000078' });
    await acceptTerms(page);
    await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
    await page.waitForURL(/\/booking\/public\/appointment\/success\?/);

    expect(await appointmentCount(db)).toBe(1);
    await expect(page.getByRole('heading', { name: 'Timen er bestilt', exact: true })).toBeVisible();
  });

  test('time slots are laid out for desktop and the same slot can be picked there', async ({ page }) => {
    await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
    await page.waitForURL(/\/select-services/);
    await page.getByRole('checkbox', { name: 'Hårklipp' }).check();
    await page.getByRole('button', { name: 'Velg tid', exact: true }).click();
    await page.waitForURL(/\/select-time/);

    // Mobile and desktop slot lists are both rendered; only one is visible per viewport.
    const visibleSlots = page.locator('button[type="submit"][name="startTime"]:visible');
    await expect(visibleSlots.first()).toBeVisible();
    await visibleSlots.first().click();
    await expect(page.getByRole('link', { name: 'Fortsett', exact: true })).toBeVisible();
  });
});
