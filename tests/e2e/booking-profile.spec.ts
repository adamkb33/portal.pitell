import type { Page } from '@playwright/test';
import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

const PROFILE = `${baseURL}/company/booking/profile`;
let accessCookie: string;
let originalDescription: string;
let originalSchedules: unknown[];
let originalServices: unknown[];
let originalImageId: number | null;

const portrait = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

test.beforeAll(async ({ request, db }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
  const profile = await db.query('select description, image_id from booking.booking_profiles where id = 1');
  originalDescription = profile.rows[0].description;
  originalImageId = profile.rows[0].image_id;
  originalSchedules = (await db.query('select * from booking.daily_schedules where profile_id = 1 order by id')).rows;
  originalServices = (await db.query('select * from booking.booking_profile_services where profile_id = 1')).rows;
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterEach(async ({ db }) => {
  await db.query('delete from booking.booking_profiles where user_id = 1 and company_id = 1 and id <> 1');
  await db.query('update booking.booking_profiles set user_id = 1, description = $1, image_id = $2 where id = 1', [
    originalDescription,
    originalImageId,
  ]);
  await db.query('delete from booking.daily_schedules where profile_id = 1');
  await db.query(
    'insert into booking.daily_schedules select * from json_populate_recordset(null::booking.daily_schedules, $1::json)',
    [JSON.stringify(originalSchedules)],
  );
  await db.query('delete from booking.booking_profile_services where profile_id = 1');
  await db.query(
    'insert into booking.booking_profile_services select * from json_populate_recordset(null::booking.booking_profile_services, $1::json)',
    [JSON.stringify(originalServices)],
  );
});

for (const [device, width] of [
  ['desktop', 1280],
  ['phone', 375],
] as const) {
  for (const [section, label] of [
    ['edit', 'Profil'],
    ['services', 'Tjenester'],
    ['work-hours', 'Arbeidstider'],
  ] as const) {
    test(`${device}: ${label} → save only this section → summary → up`, async ({ page, db }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });
      await page.getByRole('link').filter({ hasText: 'Bookingprofil' }).click();
      await expect(page).toHaveURL(PROFILE);
      const summary = page.getByRole('region', { name: 'Bookingprofil', exact: true });
      const edits = page.getByRole('region', { name: 'Rediger bookingprofil', exact: true });
      await expect(edits.getByRole('link')).toHaveCount(3);
      await edits.getByRole('link').filter({ hasText: label }).click();
      await expect(page).toHaveURL(`${PROFILE}/${section}`);
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Lagre', exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Avbryt' })).toHaveCount(0);
      await page.screenshot({ path: test.info().outputPath(`${section}-${device}.png`), fullPage: true });
      if (device === 'phone') {
        const up = page.getByRole('link', { name: 'Tilbake til Bookingprofil', exact: true });
        await expect(up).toHaveAttribute('href', '/company/booking/profile');
        await expect(up).toHaveText('');
      } else {
        await expect(
          page
            .getByRole('navigation', { name: 'Brødsmuler' })
            .getByRole('link', { name: 'Bookingprofil', exact: true }),
        ).toHaveAttribute('href', '/company/booking/profile');
      }

      if (section === 'edit') {
        await expect(page.getByRole('checkbox')).toHaveCount(0);
        await page.getByLabel('Beskrivelse (valgfritt)').fill(`E2E profil ${device}`);
        await page
          .locator('input[name="imageFile"]')
          .setInputFiles({ name: 'profil.png', mimeType: 'image/png', buffer: portrait });
        await expect(page.getByRole('img', { name: 'Profilbilde' })).toBeVisible();
      } else if (section === 'services') {
        await expect(page.locator('textarea')).toHaveCount(0);
        await page.getByRole('checkbox', { name: /Maskinklipp/ }).uncheck();
      } else {
        await expect(page.locator('textarea')).toHaveCount(0);
        // The picker never lets Til go before Fra: moving Fra past it pulls Til along, and equal times are refused.
        await pickTime(page, device, 'Mandag — Fra', '19:00');
        await expect(page.locator('input[name="MONDAY-end"]')).toHaveValue('19:00');
        await page.getByRole('button', { name: 'Lagre', exact: true }).click();
        await expect(page.getByText('Tiltid må være etter fratid')).toBeVisible();
        await expect(page).toHaveURL(`${PROFILE}/work-hours`);
        await pickTime(page, device, 'Mandag — Fra', '09:00');
        await pickTime(page, device, 'Mandag — Til', '16:00');
        await page.getByRole('checkbox', { name: 'Lørdag', exact: true }).uncheck();
        await page.getByRole('checkbox', { name: 'Søndag', exact: true }).check();
      }
      await page.getByRole('button', { name: 'Lagre', exact: true }).click();
      await expect(page).toHaveURL(PROFILE);
      await expect(page.getByRole('status').filter({ hasText: 'Bookingprofil lagret' })).toBeVisible();
      await expect(
        edits.getByText(section === 'services' ? '3 tjenester · 3 grupper' : '4 tjenester · 3 grupper'),
      ).toBeVisible();
      await expect(edits.getByText('6 arbeidsdager')).toBeVisible();
      await expect(
        summary.getByText(section === 'edit' ? `E2E profil ${device}` : originalDescription, { exact: true }),
      ).toBeVisible();
      if (section === 'edit') {
        await expect(summary.locator('img')).toBeVisible();
        await expect(summary.locator('img')).toHaveJSProperty('complete', true);
        expect(await summary.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(
          0,
        );
      }
      if (section !== 'work-hours') {
        const schedules = (await db.query('select * from booking.daily_schedules where profile_id = 1 order by id'))
          .rows;
        expect(schedules).toEqual(originalSchedules);
      }

      // Reopen to verify persistence, then exercise clearing the section completely.
      await edits.getByRole('link').filter({ hasText: label }).click();
      if (section === 'edit') {
        await expect(page.getByLabel('Beskrivelse (valgfritt)')).toHaveValue(`E2E profil ${device}`);
        await page.getByRole('button', { name: 'Fjern bilde', exact: true }).click();
        await page.getByLabel('Beskrivelse (valgfritt)').fill('');
      } else if (section === 'services') {
        await expect(page.getByRole('checkbox', { name: /Maskinklipp/ })).not.toBeChecked();
        for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.uncheck();
      } else {
        await expect(page.getByRole('checkbox', { name: 'Lørdag', exact: true })).not.toBeChecked();
        await expect(page.getByRole('checkbox', { name: 'Søndag', exact: true })).toBeChecked();
        await expect(page.locator('input[name="MONDAY-start"]')).toHaveValue('09:00');
        await expect(page.locator('input[name="MONDAY-end"]')).toHaveValue('16:00');
        for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.uncheck();
      }
      await page.getByRole('button', { name: 'Lagre', exact: true }).click();
      await expect(page).toHaveURL(PROFILE);
      if (section === 'edit') {
        await expect(summary.locator('img')).toHaveCount(0);
        await expect(summary.getByText(`E2E profil ${device}`)).toHaveCount(0);
      } else if (section === 'services') await expect(edits.getByText('0 tjenester · 0 grupper')).toBeVisible();
      else await expect(edits.getByText('0 arbeidsdager')).toBeVisible();

      await edits.getByRole('link').filter({ hasText: label }).click();
      if (device === 'phone') await page.getByRole('link', { name: 'Tilbake til Bookingprofil', exact: true }).click();
      else
        await page
          .getByRole('navigation', { name: 'Brødsmuler' })
          .getByRole('link', { name: 'Bookingprofil', exact: true })
          .click();
      await expect(page).toHaveURL(PROFILE);
    });
  }
}

test('create: empty summary → profile → save → separate edit pages', async ({ page, db }) => {
  // Keep the seed profile and its appointments intact while testing the no-profile journey.
  await db.query('update booking.booking_profiles set user_id = -1 where id = 1');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PROFILE, { waitUntil: 'networkidle' });
  await expect(page.getByText('Ingen bookingprofil', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Opprett bookingprofil', exact: true }).click();
  await expect(page).toHaveURL(`${PROFILE}/create`);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toHaveCount(0);
  await page.getByLabel('Beskrivelse (valgfritt)').fill('Ny bookingprofil');
  await page.getByRole('button', { name: 'Lagre', exact: true }).click();
  await expect(page).toHaveURL(PROFILE);
  await expect(page.getByRole('status').filter({ hasText: 'Bookingprofil lagret' })).toBeVisible();
  await expect(page.getByText('Ny bookingprofil', { exact: true })).toBeVisible();
  const edits = page.getByRole('region', { name: 'Rediger bookingprofil', exact: true });
  await expect(edits.getByText('0 tjenester · 0 grupper')).toBeVisible();
  await expect(edits.getByText('0 arbeidsdager')).toBeVisible();
  await expect(edits.getByRole('link')).toHaveCount(3);
});

/**
 * Sets a time through the real picker: the panel under the field on desktop, the bottom sheet with wheels on phones.
 * `label` is the field's name, e.g. "Mandag — Fra".
 */
async function pickTime(page: Page, device: 'desktop' | 'phone', label: string, value: string) {
  const [hour, minute] = value.split(':');
  await page.getByRole('button', { name: new RegExp(`^${label}: `) }).click();
  if (device === 'phone') {
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: `Time ${hour}`, exact: true }).click();
    await sheet.getByRole('button', { name: `Minutt ${minute}`, exact: true }).click();
    await sheet.getByRole('button', { name: `Bruk ${value}`, exact: true }).click();
    await expect(sheet).toBeHidden();
  } else {
    const panel = page.locator('[data-time-picker-panel]');
    await panel.locator(`[data-hour="${hour}"]`).click();
    await panel.locator(`[data-minute="${minute}"]`).click();
    await panel.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(panel).toBeHidden();
  }
  await expect(page.getByRole('button', { name: `${label}: ${value}`, exact: true })).toBeVisible();
}
