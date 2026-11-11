import type { Locator, Page } from '@playwright/test';
import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * The phone bottom menu and the list page's create button (approved sketch 2026-11-10): the create button floats full
 * width just above the menu on a list page only and is gone one level down; inside a domain the menu takes the
 * domain's colour and its active tab fills its whole cell.
 * Past appointments come from seedAppointmentHistory (six, so "Tidligere" has a second page).
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

const APPOINTMENTS = `${baseURL}/company/booking/appointments`;
const WHITE = 'rgb(255, 255, 255)';

let accessCookie: string;

test.beforeAll(async ({ db }) => {
  await seedAppointmentHistory(db);
});

test.beforeAll(async ({ request }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

const backgroundOf = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);

/** The phone create button lives in the fixed bottom container, outside the menu's <nav>. */
const phoneCreateButton = (page: Page) => page.locator('[data-bottom-menu-create]').getByRole('link');

test('phone: the create button floats above the menu on the list and stops on the pages below it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(APPOINTMENTS, { waitUntil: 'networkidle' });

  const bottom = page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' });
  const create = phoneCreateButton(page);

  // The list: one full-width create button just above the menu; the menu itself holds only its tabs.
  await expect(create).toHaveAccessibleName('Bestill ny avtale');
  await expect(create).toHaveAttribute('href', '/company/booking/appointments/create');
  await expect(bottom.getByRole('link', { name: 'Bestill ny avtale' })).toHaveCount(0);
  const createBox = await create.boundingBox();
  const menuBox = await bottom.boundingBox();
  expect(createBox!.y + createBox!.height).toBeLessThanOrEqual(menuBox!.y);
  expect(createBox!.width).toBeGreaterThanOrEqual(375 - 2 * 16);
  expect(createBox!.height).toBeGreaterThanOrEqual(44);

  // Focus and screen readers reach it after the page, in the order it's seen.
  const afterPage = await page.evaluate(() => {
    const main = document.querySelector('main');
    const button = document.querySelector('[data-bottom-menu-create]');
    return Boolean(main && button && main.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(afterPage).toBe(true);

  // Inside Booking the menu is tinted and Booking is the active tab.
  await expect(bottom.getByRole('link', { name: 'Booking', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await backgroundOf(bottom)).not.toBe(WHITE);

  // The end of the list scrolls clear of the button.
  await page.getByRole('button', { name: 'Tidligere', exact: true }).click();
  const nextPage = page.getByRole('button', { name: 'Neste side' });
  await expect(nextPage).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const nextPageBox = await nextPage.boundingBox();
  const createBoxScrolled = await create.boundingBox();
  expect(nextPageBox!.y + nextPageBox!.height).toBeLessThanOrEqual(createBoxScrolled!.y);

  // One level down (an appointment's own page) the create button is gone; the menu stays.
  await page
    .getByRole('link', { name: /Lovelace|Hopper|Turing/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/company\/booking\/appointments\/\d+$/);
  await expect(bottom).toBeVisible();
  await expect(create).toHaveCount(0);

  // Back up on the list it returns.
  await page.getByRole('link', { name: 'Tilbake til Timebestillinger', exact: true }).click();
  await expect(page).toHaveURL(/\/company\/booking\/appointments(\?.*)?$/);
  await expect(create).toHaveAccessibleName('Bestill ny avtale');

  // Outside a domain: white menu, blue active tab, nothing to create.
  await bottom.getByRole('link', { name: 'Oversikt', exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/company`);
  await expect(bottom.getByRole('link', { name: 'Oversikt', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(create).toHaveCount(0);
  expect(await backgroundOf(bottom)).toBe(WHITE);
});

test('desktop: the toolbar carries the same create action and there is no bottom menu', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(APPOINTMENTS, { waitUntil: 'networkidle' });

  await expect(page.getByRole('link', { name: 'Bestill ny avtale', exact: true })).toHaveAttribute(
    'href',
    '/company/booking/appointments/create',
  );
  await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeHidden();
  await expect(phoneCreateButton(page)).toBeHidden();
});
