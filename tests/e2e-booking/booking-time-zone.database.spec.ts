import { completeGuestContact, selectServices } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

// A customer abroad: the browser is in New York, the shop is in Fredrikstad. Every time must be the shop's (Oslo).
test.use({ timezoneId: 'America/New_York' });

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

const osloTime = (iso: string) =>
  new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Oslo',
  }).format(new Date(iso));
const osloWeekday = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Oslo' }).format(new Date(iso)).toUpperCase();

test('a customer in New York sees and books the shop’s own times', async ({ page, db }) => {
  await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
  await page.waitForURL(/\/select-services/);
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe('America/New_York');

  await selectServices(page, ['Hårklipp']);
  await page.getByRole('button', { name: 'Velg tid', exact: true }).click();
  await page.waitForURL(/\/select-time/);

  // Every listed time is the Oslo wall time of its slot, inside the provider's work hours for that Oslo day.
  const slots = page.locator('button[name="startTime"]:visible');
  await expect(slots.first()).toBeVisible();
  const shown = await slots.evaluateAll((buttons) =>
    buttons.map((button) => ({ value: button.getAttribute('value') ?? '', text: button.textContent?.trim() ?? '' })),
  );
  const hours = await db.query<{ start: string; end: string }>(
    `select to_char(start_time, 'HH24:MI') as start, to_char(end_time, 'HH24:MI') as end
       from booking.daily_schedules
      where profile_id = 1 and day_of_week = $1 and deleted_at is null`,
    [osloWeekday(shown[0].value)],
  );
  expect(hours.rows).toHaveLength(1);
  for (const slot of shown) {
    expect(slot.text).toBe(osloTime(slot.value));
    expect(slot.text >= hours.rows[0].start && slot.text < hours.rows[0].end).toBe(true);
  }

  // "Første ledige tid" shows the same Oslo time it books, and goes straight on.
  const quickBook = page.getByRole('button', { name: /Første ledige tid/ });
  const bookedAt = (await quickBook.getAttribute('value')) ?? '';
  await expect(quickBook).toContainText(`kl. ${osloTime(bookedAt)}`);
  await quickBook.click();
  await page.waitForURL(/\/contact(?:[?/]|$)/);

  await completeGuestContact(page, { givenName: 'Abroad', familyName: 'Customer', mobileNumber: '90000077' });
  await expect(page.getByText(`kl. ${osloTime(bookedAt)}`).first()).toBeVisible();
});
