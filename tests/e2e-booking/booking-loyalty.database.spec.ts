import type { Page } from '@playwright/test';
import type { Pool } from 'pg';
import { acceptTerms, completeGuestContact, selectBookingDetails } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
  await db.query('delete from booking.loyalty_rules where company_id = 1');
});

test.afterEach(async ({ db }) => {
  await db.query('delete from booking.loyalty_rules where company_id = 1');
});

/** An active program for company 1, switched on yesterday, so a booking made now counts. */
async function activateProgram(db: Pool, visitsRequired: number) {
  await db.query(
    `
      insert into booking.loyalty_rules (company_id, visits_required, enabled, active_since)
      values (1, $1, true, now() - interval '1 day')
    `,
    [visitsRequired],
  );
}

async function bookAsNewGuest(page: Page, mobileNumber: string) {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, { givenName: 'Loyal', familyName: 'Guest', mobileNumber });
  await acceptTerms(page);
  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  await expect(page.getByRole('heading', { name: 'Timen er bestilt', exact: true })).toBeVisible();
  // The appointment itself must have loaded, so a missing "free" banner really means "not free".
  await expect(page.getByRole('region', { name: 'Avtaledetaljer' })).toBeVisible();
}

const freeBanner = (page: Page) => page.getByRole('region', { name: 'Gratis time' });

test('when every visit is free, the confirmation page says this appointment is free', async ({ page, db }) => {
  await activateProgram(db, 1);

  await bookAsNewGuest(page, '90000091');

  await expect(freeBanner(page)).toContainText('Denne timen er gratis');
});

test('the free line is still there after reloading the confirmation page', async ({ page, db }) => {
  await activateProgram(db, 1);
  await bookAsNewGuest(page, '90000092');

  await page.reload();

  await expect(freeBanner(page)).toContainText('Denne timen er gratis');
});

test('a first visit is paid when only every 2nd visit is free', async ({ page, db }) => {
  await activateProgram(db, 2);

  await bookAsNewGuest(page, '90000093');

  await expect(freeBanner(page)).toHaveCount(0);
});

test('nothing is free when the company has no loyalty program', async ({ page }) => {
  await bookAsNewGuest(page, '90000094');

  await expect(freeBanner(page)).toHaveCount(0);
});
