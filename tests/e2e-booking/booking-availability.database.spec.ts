import type { Page } from '@playwright/test';
import { selectBookingDetails, selectServices } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
  await db.query('delete from booking.schedule_unavailability');
});

test.afterEach(async ({ db }) => {
  await db.query('delete from booking.schedule_unavailability');
});

async function openSelectTime(page: Page) {
  await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
  await page.waitForURL(/\/select-services/);
  await selectServices(page, ['Hårklipp']);
  await page.getByRole('button', { name: 'Velg tid', exact: true }).click();
  await page.waitForURL(/\/select-time/);
}

test('a provider who is unavailable for the whole window leaves nothing to book', async ({ page, db }) => {
  await db.query(
    "insert into booking.schedule_unavailability (profile_id, start_time, end_time) values (1, now() - interval '1 day', now() + interval '400 days')",
  );

  await openSelectTime(page);

  // Either the day row says there is nothing, or every day is marked fully booked: never an enabled way forward.
  await expect(page.getByRole('button', { name: /Første ledige tid/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Fortsett', exact: true })).toBeDisabled();
  await expect(page.locator('[role="group"][aria-label="Dager"] button[data-date]:not([aria-label$="fullbooket"])')).toHaveCount(0);
});

test('a day with no free times is marked fully booked and points to the next free day', async ({ page, db }) => {
  // Block tomorrow entirely (Oslo calendar day), leaving the days after it open.
  await db.query(`
    insert into booking.schedule_unavailability (profile_id, start_time, end_time)
    select 1,
           ((current_date + 1)::timestamp at time zone 'Europe/Oslo'),
           ((current_date + 2)::timestamp at time zone 'Europe/Oslo')
  `);

  await openSelectTime(page);

  const fullyBooked = page.getByRole('button', { name: /fullbooket$/ }).first();
  await expect(fullyBooked).toBeVisible();
  await fullyBooked.click();
  await expect(page.getByText('Fullbooket denne dagen')).toBeVisible();
  await page.getByRole('button', { name: 'Gå til neste ledige dag' }).click();
  await expect(page.getByText('Fullbooket denne dagen')).toHaveCount(0);
});

test('Sunday never offers a bookable day because the provider has no Sunday schedule', async ({ page }) => {
  await openSelectTime(page);
  await expect(page.getByRole('group', { name: 'Dager' })).toBeVisible();

  const sundays = page.getByRole('button', { name: /^søndag / });
  const count = await sundays.count();
  for (let i = 0; i < count; i += 1) {
    await expect(sundays.nth(i)).toHaveAccessibleName(/fullbooket$/);
  }
});

test('a booked slot disappears from the list for the next customer', async ({ page, browser, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await db.query(
    `
      insert into booking.appointments (profile_id, user_id, start_time, end_time)
      select 1, 1, s.selected_start_time, s.selected_start_time + interval '20 minutes'
      from booking.appointment_sessions s
      where s.selected_start_time is not null
      order by s.id desc
      limit 1
    `,
  );
  const taken = await db.query<{ start_time: Date }>('select start_time from booking.appointments limit 1');

  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await openSelectTime(other);
    await other.getByRole('button', { name: /Første ledige tid/ }).click();
    await other.getByRole('link', { name: 'Fortsett', exact: true }).waitFor();
    const chosen = await db.query<{ selected_start_time: Date }>(
      'select selected_start_time from booking.appointment_sessions order by id desc limit 1',
    );
    expect(chosen.rows[0].selected_start_time.getTime()).not.toBe(taken.rows[0].start_time.getTime());
  } finally {
    await context.close();
  }
});
