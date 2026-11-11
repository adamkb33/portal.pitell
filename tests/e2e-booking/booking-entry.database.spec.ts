import type { Pool } from 'pg';
import { selectBookingDetails } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

// Company 2's entitlement is row 2 of seedBookingFixture; put it back exactly as seeded.
async function removeBookingProduct(db: Pool) {
  await db.query("delete from base.company_products where company_id = 2 and product = 'BOOKING'");
}

async function restoreBookingProduct(db: Pool) {
  await db.query(
    "insert into base.company_products (id, company_id, product) values (2, 2, 'BOOKING') on conflict (company_id, product) do nothing",
  );
}

async function sessionCount(db: Pool) {
  const result = await db.query<{ count: string }>('select count(*)::text as count from booking.appointment_sessions');
  return Number(result.rows[0].count);
}

test('a company without the BOOKING product cannot start a booking', async ({ page, db }) => {
  await removeBookingProduct(db);
  try {
    await page.goto('/booking/public/appointment/session?companyId=2&reset=1');

    await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
    await expect(page).not.toHaveURL(/\/session/);
    expect(await sessionCount(db)).toBe(0);
  } finally {
    await restoreBookingProduct(db);
  }
});

test('a company that does not exist cannot start a booking', async ({ page, db }) => {
  await page.goto('/booking/public/appointment/session?companyId=999999&reset=1');

  await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
  expect(await sessionCount(db)).toBe(0);
});

test('a non-numeric companyId is refused with a message and starts nothing', async ({ page, db }) => {
  await page.goto('/booking/public/appointment/session?companyId=abc&reset=1');

  await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
  await expect(page.getByText('Selskaps-ID er ugyldig.')).toBeVisible();
  expect(await sessionCount(db)).toBe(0);
});

test('a missing companyId is refused with a message and starts nothing', async ({ page, db }) => {
  await page.goto('/booking/public/appointment/session?reset=1');

  await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
  await expect(page.getByText('Selskaps-ID mangler.')).toBeVisible();
  expect(await sessionCount(db)).toBe(0);
});

test('an unknown theme is refused with a message and starts nothing', async ({ page, db }) => {
  await page.goto('/booking/public/appointment/session?companyId=1&theme=not-a-theme&reset=1');

  await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
  await expect(page.getByText('Tema er ugyldig.')).toBeVisible();
  expect(await sessionCount(db)).toBe(0);
});

test('the place list offers every booking-ready company and starts the chosen one', async ({ page }) => {
  await page.goto('/booking/public/appointment');

  await expect(page.getByRole('heading', { name: 'Hvor vil du bestille?' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Bestill hos Nordre Frisør/i })).toBeVisible();
  await page.getByRole('link', { name: /Bestill hos Nordre Frisør/i }).click();
  await page.waitForURL(/\/session\/employee/);
  await expect(page.getByRole('button', { name: 'Velg Anna' })).toBeVisible();
});

test('a company that loses the BOOKING product disappears from the place list', async ({ page, db }) => {
  await removeBookingProduct(db);
  try {
    await page.goto('/booking/public/appointment');
    await expect(page.getByRole('heading', { name: 'Hvor vil du bestille?' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Bestill hos Nordre Frisør/i })).toHaveCount(0);
  } finally {
    await restoreBookingProduct(db);
  }
});

test('switching company discards the earlier company’s selections', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);

  await page.goto('/booking/public/appointment/session?companyId=2');
  await page.waitForURL(/\/session\/employee/);
  await expect(page.getByRole('button', { name: 'Velg Anna' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Velg Bjørn' })).toBeVisible();

  await page.getByRole('button', { name: 'Velg Anna' }).click();
  await page.waitForURL(/\/select-services/);
  await expect(page.getByRole('checkbox', { name: 'Hårklipp' })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Herreklipp' })).not.toBeChecked();

  const latest = await db.query<{ company_id: string; services: string }>(`
    select s.company_id::text,
           (select count(*)::text from booking.appointment_session_services x where x.appointment_session_id = s.id) as services
    from booking.appointment_sessions s
    where s.deleted_at is null
    order by s.id desc
    limit 1
  `);
  expect(latest.rows[0]).toEqual({ company_id: '2', services: '0' });
});

test('a company with no providers is refused instead of starting a dead-end session', async ({ page, db }) => {
  await db.query(`
    insert into base.companies (id, org_num, name) values (3, '927491747', 'Tomt Salong');
    insert into base.company_profiles (id, company_id, display_name) values (3, 3, 'Tomt Salong');
    insert into base.company_products (id, company_id, product) values (3, 3, 'BOOKING');
  `);
  try {
    await page.goto('/booking/public/appointment/session?companyId=3&reset=1');

    await expect(page).toHaveURL(/\/booking\/public\/appointment(?:[?]|$)/);
    expect(await sessionCount(db)).toBe(0);
  } finally {
    await db.query(`
      delete from base.company_products where company_id = 3;
      delete from base.company_profiles where company_id = 3;
      delete from base.companies where id = 3;
    `);
  }
});
