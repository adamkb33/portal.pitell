import type { Pool } from 'pg';
import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Varsler (approved sketch 2026-11-10): the bell's panel, the list grouped by day with Alle | Uleste, and one
 * notification's own page with the appointment it is about. Opening a notification reads it.
 * The signed-in admin is user 1 in company 1; the appointment comes from seedAppointmentHistory.
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

const E2E_SOURCE = 'e2e-notifications';
let accessCookie: string;
let appointmentId: string;
let unreadId: string;

async function seedNotifications(db: Pool) {
  await db.query(`delete from notification.in_app_notifications where company_id = 1 and recipient_user_id = 1`);
  const appointment = await db.query<{ id: string }>(
    `select id::text from booking.appointments where profile_id = 1 and deleted_at is null order by id limit 1`,
  );
  appointmentId = appointment.rows[0].id;
  const content = `Ada Lovelace har bestilt Hårklipp.\n\nÅpne timebestilling: ${baseURL}/company/booking/appointments/${appointmentId}`;
  const inserted = await db.query<{ id: string }>(
    `
      insert into notification.in_app_notifications
        (company_id, recipient_user_id, subject, content, source_service, source_ref_type, source_ref_id, created_at, read_at)
      values
        (1, 1, 'Ny timebestilling', $1, $2, 'APPOINTMENT', $3, now() - interval '1 minute', null),
        (1, 1, 'Ny timebestilling', 'Grace Hopper har bestilt Skjeggtrim.', $2, 'APPOINTMENT', $3,
          now() - interval '1 day', now() - interval '1 day')
      returning id::text
    `,
    [content, E2E_SOURCE, appointmentId],
  );
  unreadId = inserted.rows[0].id;
}

test.beforeAll(async ({ db, request }) => {
  await seedAppointmentHistory(db);
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context, db }) => {
  await seedNotifications(db);
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await db.query(`delete from notification.in_app_notifications where source_service = $1`, [E2E_SOURCE]);
});

test('desktop: bell → unread notification → its page with the appointment → Varsler, Alle | Uleste', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });

  // The bell says how many are unread, and its panel lists the latest with the unread one marked.
  await page.getByRole('button', { name: 'Varsler, 1 uleste' }).click();
  const panel = page.getByRole('dialog', { name: 'Varsler' });
  await expect(panel).toContainText('1 ulest');
  await expect(panel.getByRole('link', { name: /Ny timebestilling/ })).toHaveCount(2);
  await expect(panel.getByRole('link', { name: 'Se alle varsler' })).toHaveAttribute('href', '/company/notifications');
  await panel.getByRole('link', { name: /^Ulest: Ny timebestilling/ }).click();

  // Its own page: named after the notification, the message without the link, then the appointment's row.
  await expect(page).toHaveURL(`${baseURL}/company/notifications/${unreadId}`);
  await expect(panel).toBeHidden();
  const breadcrumb = page.getByRole('navigation', { name: 'Brødsmuler' });
  await expect(breadcrumb).toContainText('Ny timebestilling');
  const message = page.getByRole('region', { name: 'Varsel', exact: true });
  await expect(message).toContainText('Ada Lovelace har bestilt Hårklipp.');
  await expect(message).not.toContainText('http');
  await expect(page.getByRole('region', { name: 'Avtalen' }).getByRole('link')).toHaveAttribute(
    'href',
    `/company/booking/appointments/${appointmentId}`,
  );
  // Opening it read it: the bell has nothing unread any more.
  await expect(page.getByRole('button', { name: 'Varsler', exact: true })).toBeVisible();

  // Up to Varsler: grouped by day, Alle | Uleste in the URL, and an empty Uleste now.
  await breadcrumb.getByRole('link', { name: 'Varsler', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/company/notifications`);
  const list = page.getByRole('region', { name: 'Varsler', exact: true });
  await expect(list.getByRole('heading', { level: 3 })).toHaveText([/^I dag · /, /^I går · /]);
  await expect(list).toContainText('2 varsler');
  const show = page.getByRole('navigation', { name: 'Vis varsler' });
  await expect(show.getByRole('link', { name: 'Alle' })).toHaveAttribute('aria-current', 'page');
  await show.getByRole('link', { name: /^Uleste/ }).click();
  await expect(page).toHaveURL(`${baseURL}/company/notifications?vis=uleste`);
  await expect(page.getByText('Ingen uleste varsler')).toBeVisible();
  await page.getByRole('link', { name: 'Vis alle' }).click();
  await expect(page).toHaveURL(`${baseURL}/company/notifications`);
});

test('phone: the bell drops a full-width panel under the bar, and ‹ leads back to Varsler', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Varsler, 1 uleste' }).click();
  const panel = page.getByRole('dialog', { name: 'Varsler' });
  // Measured once its zoom-in has settled.
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(375);
  const box = await panel.boundingBox();
  expect(box?.x).toBe(0);
  expect(box?.y).toBe(60);

  await panel.getByRole('link', { name: 'Se alle varsler' }).click();
  await expect(page).toHaveURL(`${baseURL}/company/notifications`);
  // Varsler sits right under Mitt selskap, so the header keeps ≡ and there is no create button.
  await expect(page.getByRole('button', { name: 'Åpne meny' })).toBeVisible();
  await expect(page.locator('[data-bottom-menu-create]')).toHaveCount(0);

  const list = page.getByRole('region', { name: 'Varsler', exact: true });
  await list.getByRole('link', { name: /^Ulest: Ny timebestilling/ }).click();
  await expect(page).toHaveURL(`${baseURL}/company/notifications/${unreadId}`);
  await page.getByRole('link', { name: 'Tilbake til Varsler', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/company/notifications`);
  await expect(list.getByRole('link', { name: /^Ulest:/ })).toHaveCount(0);
});

test('desktop: Merk alle som lest reads every unread notification, and only the signed-in user’s', async ({
  page,
  db,
}) => {
  // A second unread one for the admin, and an unread one for someone else that must stay unread.
  await db.query(
    `delete from notification.in_app_notifications where recipient_user_id = 999 and source_service = $1`,
    [E2E_SOURCE],
  );
  await db.query(
    `
      insert into notification.in_app_notifications
        (company_id, recipient_user_id, subject, content, source_service, created_at, read_at)
      values
        (1, 1, 'Avbestilt time', 'Grace Hopper har avbestilt.', $1, now() - interval '2 minutes', null),
        (1, 999, 'Ny timebestilling', 'Til en annen bruker.', $1, now(), null)
    `,
    [E2E_SOURCE],
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/company/notifications`, { waitUntil: 'networkidle' });
  const list = page.getByRole('region', { name: 'Varsler', exact: true });
  await expect(list.getByRole('link', { name: /^Ulest:/ })).toHaveCount(2);

  await list.getByRole('button', { name: 'Merk alle som lest' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Alle varsler er lest' })).toBeVisible();
  await expect(list.getByRole('link', { name: /^Ulest:/ })).toHaveCount(0);
  await expect(list).toContainText('3 varsler');
  // Nothing left to read: the button and the bell's count are gone.
  await expect(list.getByRole('button', { name: 'Merk alle som lest' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Varsler', exact: true })).toBeVisible();

  const others = await db.query(
    `select count(*)::int as unread from notification.in_app_notifications
       where recipient_user_id = 999 and source_service = $1 and read_at is null`,
    [E2E_SOURCE],
  );
  expect(others.rows[0].unread).toBe(1);
});

test('phone: Merk alle som lest fits beside Alle | Uleste with a 44px target', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/company/notifications`, { waitUntil: 'networkidle' });
  const button = page.getByRole('button', { name: 'Merk alle som lest' });
  const box = await button.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);

  await button.click();
  await expect(page.getByRole('status').filter({ hasText: 'Alle varsler er lest' })).toBeVisible();
  await expect(button).toHaveCount(0);
});
