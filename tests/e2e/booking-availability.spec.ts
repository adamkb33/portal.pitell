import { addDays, format, nextMonday, nextSunday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { dayTitle } from '../../app/routes/company/booking/_utils/periods';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Tilgjengelighet (Bookbar tid | Fravær), the area built from the approved sketch on 2026-11-07.
 * ui-rules: every screen we build gets an e2e test of its flow.
 *
 * The seed gives profile 1 working hours Mon–Fri 08–18 and Sat 08–16, so bookable time on a Sunday is stored as
 * entered (only time outside working hours is kept). Dates and times are set through the create pages' URL
 * parameters; the pickers are custom popovers and are not what these tests are about.
 */

const LIST = `${baseURL}/company/booking/schedule/availabilities`;
const ABSENCE = `${baseURL}/company/booking/schedule-unavailability`;

const sunday = nextSunday(addDays(new Date(), 7));
const monday = nextMonday(addDays(new Date(), 7));
const iso = (date: Date) => format(date, 'yyyy-MM-dd');

let accessCookie: string;

test.beforeAll(async ({ request }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context, db }) => {
  await db.query('delete from booking.schedule_availability where profile_id = 1');
  await db.query('delete from booking.schedule_unavailability where profile_id = 1');
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await db.query('delete from booking.schedule_availability where profile_id = 1');
  await db.query('delete from booking.schedule_unavailability where profile_id = 1');
});

test('desktop: overview → Bookbar tid → create → open → delete', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });

  await page.getByRole('link').filter({ hasText: 'Tilgjengelighet' }).click();
  await expect(page).toHaveURL(LIST);
  const area = page.getByRole('navigation', { name: 'Bytt mellom bookbar tid og fravær' });
  await expect(area.getByRole('link', { name: 'Bookbar tid' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Ingen kommende bookbar tid')).toBeVisible();

  await page.getByRole('link', { name: 'Ny bookbar tid' }).click();
  await expect(page).toHaveURL(`${LIST}/create`);

  await page.goto(`${LIST}/create?date=${iso(sunday)}&startTime=10:00&endTime=14:00`, { waitUntil: 'networkidle' });
  await expect(page.getByText(`${dayTitle(sunday)} · 10:00–14:00 · 4 t`)).toBeVisible();
  await page.getByRole('button', { name: 'Lagre' }).click();

  await expect(page).toHaveURL(LIST);
  await expect(page.getByRole('status').filter({ hasText: 'Bookbar tid lagret' })).toBeVisible();
  const row = page
    .getByRole('link')
    .filter({ hasText: dayTitle(sunday) })
    .filter({ hasText: '10:00–14:00 · 4 t' });
  await expect(row).toBeVisible();
  // The count in the list footer (the month strip says "1 tidsrom" too).
  await expect(page.getByRole('region', { name: 'Bookbar tid' }).getByRole('paragraph')).toHaveText('1 tidsrom');

  await row.click();
  await expect(page).toHaveURL(/\/availabilities\/edit\?id=\d+$/);
  await page.getByRole('button', { name: 'Slett bookbar tid' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Behold' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Slett bookbar tid' }).click();

  await expect(page).toHaveURL(LIST);
  await expect(page.getByRole('status').filter({ hasText: 'Bookbar tid slettet' })).toBeVisible();
  await expect(page.getByText('Ingen kommende bookbar tid')).toBeVisible();
});

test('desktop: Fravær → create → open → delete, and Kommende | Tidligere', async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat/i.test(message.text())) hydrationErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    if (/hydrat/i.test(error.message)) hydrationErrors.push(error.message);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(LIST, { waitUntil: 'networkidle' });

  await page
    .getByRole('navigation', { name: 'Bytt mellom bookbar tid og fravær' })
    .getByRole('link', { name: 'Fravær' })
    .click();
  await expect(page).toHaveURL(ABSENCE);
  await expect(page.getByText('Ingen kommende fravær')).toBeVisible();

  await page.getByRole('navigation', { name: 'Periode' }).getByRole('link', { name: 'Tidligere' }).click();
  await expect(page).toHaveURL(`${ABSENCE}?periode=tidligere`);
  await expect(page.getByText('Ingen tidligere fravær')).toBeVisible();
  await page.getByRole('navigation', { name: 'Periode' }).getByRole('link', { name: 'Kommende' }).click();

  await page.getByRole('link', { name: 'Nytt fravær' }).click();
  await expect(page).toHaveURL(`${ABSENCE}/create`);
  // A direct load hydrates the empty form; client navigation alone does not catch mismatched range IDs.
  await page.reload({ waitUntil: 'networkidle' });
  // Hele dagen is a choice, not the default.
  await expect(page.getByRole('switch', { name: 'Hele dagen' })).toHaveAttribute('aria-checked', 'false');
  expect(hydrationErrors).toEqual([]);

  // One click picks one day: Slutter follows Starter, and the Lagre bar names the day (approved sketch 2026-11-11).
  const starter = page.getByRole('button', { name: 'Starter', exact: true });
  const slutter = page.getByRole('button', { name: 'Slutter', exact: true });
  await starter.click();
  const calendar = page.getByRole('dialog');
  if (monday.getMonth() !== new Date().getMonth()) await calendar.getByRole('button', { name: 'Neste måned' }).click();
  await calendar.getByRole('button', { name: format(monday, 'eeee d. MMMM yyyy', { locale: nb }) }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(slutter).toHaveText(await starter.innerText());
  await expect(page.getByText(/· \d{2}:\d{2}–\d{2}:\d{2} · 1 t$/)).toBeVisible();

  await page.goto(`${ABSENCE}/create?from=${iso(monday)}T10:00:00&to=${iso(monday)}T11:00:00`, {
    waitUntil: 'networkidle',
  });
  // Opened from a time in Kalender: that time, as one period on one day.
  await expect(page.getByRole('switch', { name: 'Hele dagen' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText(/· 10:00–11:00 · 1 t$/)).toBeVisible();
  // Up lives in the header (ui-rules → Page top): the breadcrumb on desktop, no in-page back link.
  await expect(
    page.getByRole('navigation', { name: 'Brødsmuler' }).getByRole('link', { name: 'Fravær', exact: true }),
  ).toHaveAttribute('href', '/company/booking/schedule-unavailability');
  await page.getByRole('button', { name: 'Lagre' }).click();

  await expect(page).toHaveURL(ABSENCE);
  await expect(page.getByRole('status').filter({ hasText: 'Fravær lagret' })).toBeVisible();
  const row = page
    .getByRole('link')
    .filter({ hasText: dayTitle(monday) })
    .filter({ hasText: '10:00–11:00' });
  await expect(row).toBeVisible();

  await row.click();
  await expect(page).toHaveURL(/\/schedule-unavailability\/detail\?/);
  await expect(page.getByText('10:00–11:00')).toBeVisible();
  await page.getByRole('button', { name: 'Slett fravær' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Behold' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Slett fravær' }).click();

  await expect(page).toHaveURL(ABSENCE);
  await expect(page.getByRole('status').filter({ hasText: 'Fravær slettet' })).toBeVisible();
  await expect(page.getByText('Ingen kommende fravær')).toBeVisible();
});

test('phone: ‹ goes one level up, the create button creates what the page lists, and form pages hide the bottom menu', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const bottomMenu = page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' });
  const up = (label: string) => page.getByRole('link', { name: `Tilbake til ${label}`, exact: true });
  const menu = page.getByRole('button', { name: 'Åpne meny', exact: true });

  await page.goto(LIST, { waitUntil: 'networkidle' });
  // Bookbar tid belongs to Booking in the domain map, though its URL sits under Kalender.
  await expect(up('Booking')).toHaveAttribute('href', '/company/booking');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ny bookbar tid', exact: true })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Bytt mellom bookbar tid og fravær' })
    .getByRole('link', { name: 'Fravær' })
    .click();
  await expect(page).toHaveURL(ABSENCE);
  await page.getByRole('navigation', { name: 'Periode' }).getByRole('link', { name: 'Tidligere' }).click();
  await expect(page).toHaveURL(`${ABSENCE}?periode=tidligere`);
  await page.getByRole('link', { name: 'Nytt fravær', exact: true }).click();

  await expect(page).toHaveURL(`${ABSENCE}/create`);
  await expect(bottomMenu).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lagre' })).toBeVisible();

  // ‹ returns to the list as it was left, then on up to the section, which has the menu again.
  await up('Fravær').click();
  await expect(page).toHaveURL(`${ABSENCE}?periode=tidligere`);
  await up('Booking').click();
  await expect(page).toHaveURL(`${baseURL}/company/booking`);
  await expect(menu).toBeVisible();
});
