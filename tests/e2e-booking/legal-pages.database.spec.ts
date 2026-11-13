import type { Page } from '@playwright/test';
import { completeGuestContact, selectBookingDetails } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

/**
 * The terms (/vilkar) and privacy notice (/personvern): reachable from the booking overview, sign-in and the footer,
 * public without login, and naming the company that runs Pitell.
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

async function expectTermsPage(page: Page) {
  await expect(page).toHaveURL(/\/vilkar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Vilkår' })).toBeVisible();
  await expect(page.getByText(/inntil én time før timen starter/)).toBeVisible();
}

async function expectPrivacyPage(page: Page) {
  await expect(page).toHaveURL(/\/personvern$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Personvernerklæring' })).toBeVisible();
}

test.describe('booking overview', () => {
  test.beforeEach(async ({ db }) => {
    await resetMutableBookingState(db);
  });

  test('a first-time customer can open the terms and the privacy notice in a new tab', async ({ page, context }) => {
    await selectBookingDetails(page, ['Hårklipp']);
    await completeGuestContact(page, { givenName: 'Lese', familyName: 'Vilkår', mobileNumber: '90000081' });

    const terms = page.getByRole('region', { name: 'Vilkår og personvern' });
    await expect(terms.getByRole('checkbox', { name: /Jeg godtar/ })).not.toBeChecked();

    const [termsTab] = await Promise.all([
      context.waitForEvent('page'),
      terms.getByRole('link', { name: 'vilkårene' }).click(),
    ]);
    await expectTermsPage(termsTab);
    await termsTab.close();

    const [privacyTab] = await Promise.all([
      context.waitForEvent('page'),
      terms.getByRole('link', { name: 'personvernerklæringen' }).click(),
    ]);
    await expectPrivacyPage(privacyTab);
    await privacyTab.close();

    // The booking is still waiting where the customer left it.
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByRole('button', { name: /Bekreft timebestilling/ })).toBeDisabled();
  });
});

test('both pages are public and name the company that runs Pitell', async ({ page }) => {
  for (const path of ['/vilkar', '/personvern']) {
    await page.goto(path);
    await expect(
      page.getByText(/Baser IT Consulting, Bramers vei 41, 1613 Fredrikstad, org\.nr\. 931 863 037/),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'post@pitell.no' }).first()).toHaveAttribute(
      'href',
      'mailto:post@pitell.no',
    );
    await expect(page.getByText('TODO')).toHaveCount(0);
  }
});

test('the terms link to the privacy notice', async ({ page }) => {
  await page.goto('/vilkar');
  await page.getByRole('main').getByRole('link', { name: 'personvernerklæringen' }).click();
  await expectPrivacyPage(page);
});

test('sign-in links to the terms and the privacy notice', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByRole('link', { name: 'vilkårene' }).click();
  await expectTermsPage(page);

  await page.goto('/auth/sign-in');
  await page.getByRole('link', { name: 'personvernerklæringen' }).click();
  await expectPrivacyPage(page);
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('the footer links to both pages', async ({ page }) => {
    await page.goto('/personvern');
    const footer = page.getByRole('navigation', { name: 'Juridisk' });
    await footer.getByRole('link', { name: 'Vilkår' }).click();
    await expectTermsPage(page);

    await page.getByRole('navigation', { name: 'Juridisk' }).getByRole('link', { name: 'Personvern' }).click();
    await expectPrivacyPage(page);
  });
});
