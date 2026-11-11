import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import {
  addVisit,
  cleanLoyaltyData,
  createCustomer,
  daysFromNow,
  portalCookieValue,
  setRule,
  signInAsCompanyAdmin,
} from './loyalty.helpers';

let accessCookie: string;

test.beforeAll(async ({ request }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context, db }) => {
  await cleanLoyaltyData(db);
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test.afterAll(async ({ db }) => {
  await cleanLoyaltyData(db);
});

const appointmentsUrl = (familyName: string) =>
  `${baseURL}/company/booking/appointments?search=${encodeURIComponent(familyName)}`;

test('the admin switches the loyalty program on, and the settings stick', async ({ page, db }) => {
  await page.goto(`${baseURL}/company/booking/admin/loyalty`);
  await expect(page.getByRole('heading', { name: 'Lojalitetsprogram', exact: true })).toBeVisible();

  await page.getByLabel(/Hvilket besøk er gratis/).fill('4');
  await page.getByRole('checkbox', { name: 'Lojalitetsprogrammet er aktivt' }).check();
  await page.getByRole('button', { name: 'Lagre', exact: true }).click();
  await expect(page.getByText('Lojalitetsprogrammet er lagret.')).toBeVisible();

  const stored = await db.query<{ visits_required: number; enabled: boolean; active_since: Date | null }>(
    'select visits_required, enabled, active_since from booking.loyalty_rules where company_id = 1',
  );
  expect(stored.rows[0]).toMatchObject({ visits_required: 4, enabled: true });
  expect(stored.rows[0].active_since).not.toBeNull();

  await page.reload();
  await expect(page.getByLabel(/Hvilket besøk er gratis/)).toHaveValue('4');
  await expect(page.getByRole('checkbox', { name: 'Lojalitetsprogrammet er aktivt' })).toBeChecked();
});

test('staff see which appointment is free, in the list and on the appointment page', async ({ page, db }) => {
  await setRule(db, { visitsRequired: 3 });
  const customer = await createCustomer(db);
  await addVisit(db, customer.id, daysFromNow(1));
  await addVisit(db, customer.id, daysFromNow(2));
  const free = await addVisit(db, customer.id, daysFromNow(3));

  await page.goto(appointmentsUrl(customer.familyName));
  const rows = page.getByRole('region', { name: 'Timebestillingsliste' }).getByRole('list').getByRole('link');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).not.toContainText('Gratis');
  await expect(rows.nth(1)).not.toContainText('Gratis');
  await expect(rows.nth(2)).toContainText('Gratis');

  await rows.nth(2).click();
  await expect(page).toHaveURL(`${baseURL}/company/booking/appointments/${free}`);
  await expect(page.getByText('Gratis besøk (lojalitetsprogram)')).toBeVisible();

  await page.goBack();
  await rows.nth(0).click();
  await expect(page).toHaveURL(/\/company\/booking\/appointments\/\d+$/);
  await expect(page.getByRole('heading', { name: new RegExp(customer.familyName) })).toBeVisible();
  await expect(page.getByText('Gratis besøk (lojalitetsprogram)')).toHaveCount(0);
});

test('the admin marks a past appointment "ikke møtt" and can undo it', async ({ page, db }) => {
  const customer = await createCustomer(db);
  const id = await addVisit(db, customer.id, daysFromNow(-1));
  const noShowInDb = async () =>
    (await db.query<{ no_show: boolean }>('select no_show from booking.appointments where id = $1', [id])).rows[0]
      .no_show;

  await page.goto(`${baseURL}/company/booking/appointments/${id}`);
  await page.getByRole('button', { name: 'Marker som ikke møtt', exact: true }).click();
  await expect(page.getByText('Kunden møtte ikke opp.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Angre ikke møtt', exact: true })).toBeVisible();
  expect(await noShowInDb()).toBe(true);

  const pastList = `${baseURL}/company/booking/appointments?toDateTime=${encodeURIComponent(new Date().toISOString())}&direction=DESC&search=${encodeURIComponent(customer.familyName)}`;
  await page.goto(pastList);
  const row = page.getByRole('region', { name: 'Timebestillingsliste' }).getByRole('list').getByRole('link');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Ikke møtt');

  await row.click();
  await page.getByRole('button', { name: 'Angre ikke møtt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Marker som ikke møtt', exact: true })).toBeVisible();
  await expect(page.getByText('Kunden møtte ikke opp.')).toHaveCount(0);
  expect(await noShowInDb()).toBe(false);
});

test('an appointment that has not started has no "ikke møtt" button', async ({ page, db }) => {
  const customer = await createCustomer(db);
  const id = await addVisit(db, customer.id, daysFromNow(2));

  await page.goto(`${baseURL}/company/booking/appointments/${id}`);

  await expect(page.getByRole('heading', { name: new RegExp(customer.familyName) })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Marker som ikke møtt', exact: true })).toHaveCount(0);
});
