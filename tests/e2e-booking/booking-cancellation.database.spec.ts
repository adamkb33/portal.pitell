import type { Browser, Locator, Page } from '@playwright/test';
import type { Pool } from 'pg';
import { acceptTerms, completeGuestContact, selectBookingDetails, selectServices } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

/** Books one haircut as a guest and returns the new appointment's id. The page stays signed in as that customer. */
async function bookAs(page: Page, mobileNumber: string) {
  await selectBookingDetails(page, ['Hårklipp']);
  return confirmAs(page, mobileNumber);
}

/** Starts a new booking of one haircut and opens the time step. */
async function openTimes(page: Page) {
  await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
  await page.waitForURL(/\/select-services/);
  await selectServices(page, ['Hårklipp']);
  await page.getByRole('button', { name: 'Velg tid', exact: true }).click();
  await page.waitForURL(/\/select-time/);
}

const openDays = (page: Page) =>
  page.getByRole('group', { name: 'Dager' }).locator('button[data-date]:not([aria-label$="fullbooket"])');
const dayButton = (page: Page, day: string) =>
  page.getByRole('group', { name: 'Dager' }).locator(`button[data-date="${day}"]`);
/** The times listed for the chosen day (the "Første ledige tid" button is also a startTime button, so it is left out). */
const times = (page: Page) =>
  page.locator('button[name="startTime"]:visible').filter({ hasNotText: 'Første ledige tid' });
const timeButton = (page: Page, startTime: string) => times(page).and(page.locator(`[value="${startTime}"]`));

/** Picks a day in the day strip. The click is retried because a click before hydration does nothing. */
async function chooseDay(day: Locator) {
  await expect(async () => {
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
  }).toPass();
}

/** With a time chosen: continues, verifies as a new guest and confirms. Returns the new appointment's id. */
async function confirmAs(page: Page, mobileNumber: string) {
  if (/\/select-time/.test(page.url())) {
    await page.getByRole('link', { name: 'Fortsett', exact: true }).click();
    await page.waitForURL(/\/(contact|overview)(?:[?/]|$)/);
  }
  await completeGuestContact(page, { givenName: 'Cancel', familyName: mobileNumber, mobileNumber });
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  return Number(new URL(page.url()).searchParams.get('appointmentId'));
}

/** Moves an appointment far enough ahead that no cancellation cut-off can apply. */
async function moveAWeekAhead(db: Pool, appointmentId: number) {
  await db.query(
    "update booking.appointments set start_time = now() + interval '7 days', end_time = now() + interval '7 days 20 minutes' where id = $1",
    [appointmentId],
  );
}

async function withSecondVisitor(browser: Browser, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext();
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

test('a cancelled slot is offered again and can be booked by someone else', async ({ page, browser, db }) => {
  // The first time on the second open day: always more than an hour away, so the cancellation cut-off never applies.
  // (The first free time is only 45 minutes ahead, which is too late to cancel.)
  await openTimes(page);
  const laterDay = openDays(page).nth(1);
  const day = (await laterDay.getAttribute('data-date')) as string;
  await chooseDay(laterDay);
  const slot = times(page).first();
  const startTime = (await slot.getAttribute('value')) as string;
  await slot.click();
  const firstId = await confirmAs(page, '90000051');
  const booked = await db.query<{ start_time: Date }>('select start_time from booking.appointments where id = $1', [
    firstId,
  ]);
  const slotStart = booked.rows[0].start_time;
  expect(slotStart.getTime() - Date.now(), 'The booked time must be more than an hour away.').toBeGreaterThan(
    3_600_000,
  );

  await withSecondVisitor(browser, async (second) => {
    // While booked, the time is not offered to anyone else.
    await openTimes(second);
    await chooseDay(dayButton(second, day));
    await expect(times(second).first()).toBeVisible();
    await expect(timeButton(second, startTime)).toHaveCount(0);

    // "Behold timen" goes back to the appointment and leaves it booked.
    await page.goto(`/booking/public/appointment/cancel-by-id/${firstId}`);
    await expect(page.getByRole('heading', { name: 'Avbestille timen?' })).toBeVisible();
    await page.getByRole('link', { name: 'Behold timen', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/booking/public/my-appointments/${firstId}$`));

    // The page is the question, so one tap cancels: no second dialog. Then Mine bookinger with the toast.
    await page.goto(`/booking/public/appointment/cancel-by-id/${firstId}`);
    await page.getByRole('button', { name: 'Avbestill timen', exact: true }).click();
    await expect(page).toHaveURL(/\/booking\/public\/my-appointments$/);
    await expect(page.getByRole('status').filter({ hasText: 'Timen er avbestilt' })).toBeVisible();
    await expect
      .poll(async () => {
        const row = await db.query('select cancelled_at from booking.appointments where id = $1', [firstId]);
        return row.rows[0]?.cancelled_at !== null;
      })
      .toBe(true);

    // Once cancelled, the same time is offered again and the second customer can book it.
    await second.reload();
    await chooseDay(dayButton(second, day));
    await timeButton(second, startTime).click();
    const secondId = await confirmAs(second, '90000052');
    const rebooked = await db.query<{ start_time: Date }>('select start_time from booking.appointments where id = $1', [
      secondId,
    ]);
    expect(rebooked.rows[0].start_time.getTime()).toBe(slotStart.getTime());
  });

  const live = await db.query<{ count: string }>(
    'select count(*)::text as count from booking.appointments where cancelled_at is null',
  );
  expect(live.rows[0].count).toBe('1');
});

test('a customer cannot cancel someone else’s appointment', async ({ page, browser, db }) => {
  const victimId = await bookAs(page, '90000053');
  await moveAWeekAhead(db, victimId);

  await withSecondVisitor(browser, async (attacker) => {
    await bookAs(attacker, '90000054');

    await attacker.goto(`/booking/public/appointment/cancel-by-id/${victimId}`);
    // The backend only returns an appointment to its owner, so to anyone else it looks like it doesn't exist:
    // the page shows the calm "already cancelled" page, with no appointment details and nothing to cancel.
    await expect(attacker.getByRole('heading', { name: 'Timen er allerede avbestilt' })).toBeVisible();
    await expect(attacker.getByRole('button', { name: 'Avbestill timen', exact: true })).toHaveCount(0);
  });

  const victim = await db.query<{ cancelled_at: Date | null }>(
    'select cancelled_at from booking.appointments where id = $1',
    [victimId],
  );
  expect(victim.rows[0].cancelled_at).toBeNull();
});

test('an appointment that has already started cannot be cancelled', async ({ page, db }) => {
  const appointmentId = await bookAs(page, '90000055');
  await db.query(
    "update booking.appointments set start_time = now() - interval '10 minutes', end_time = now() + interval '10 minutes' where id = $1",
    [appointmentId],
  );

  await page.goto(`/booking/public/appointment/cancel-by-id/${appointmentId}`);
  await expect(page.getByText('Timen har startet og kan ikke avbestilles her.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Avbestill timen', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Til timen', exact: true })).toHaveAttribute(
    'href',
    `/booking/public/my-appointments/${appointmentId}`,
  );

  const row = await db.query('select cancelled_at from booking.appointments where id = $1', [appointmentId]);
  expect(row.rows[0].cancelled_at).toBeNull();
});

test('a visitor who is not signed in is sent to sign in instead of seeing the appointment', async ({
  page,
  browser,
  db,
}) => {
  const appointmentId = await bookAs(page, '90000056');
  await moveAWeekAhead(db, appointmentId);

  await withSecondVisitor(browser, async (stranger) => {
    await stranger.goto(`/booking/public/appointment/cancel-by-id/${appointmentId}`);
    await expect(stranger).not.toHaveURL(/cancel-by-id/);
    await expect(stranger.getByText('Du må logge inn for å avbestille time.')).toBeVisible();
  });
});
