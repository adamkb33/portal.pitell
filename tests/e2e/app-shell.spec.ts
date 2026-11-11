import { expect, test } from '../e2e-booking/fixtures';
import { backendUrl, e2eAdmin, frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * The company app's chrome, built from the approved sketches on 2026-11-09: the blue phone top bar, the navy sidebar
 * with the company card on top and the account at the bottom, the phone menu, and the bottom menu's active tab
 * (its colour and the create button above it: bottom-menu.spec.ts).
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

let accessCookie: string;

test.beforeAll(async ({ request }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

test('desktop: sidebar marks the section, the company sits on top and the account menu is at the bottom', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/company/booking/statistics`, { waitUntil: 'networkidle' });

  const sidebar = page.getByRole('navigation', { name: 'Hovednavigasjon' });
  await expect(sidebar.getByRole('link', { name: 'Booking', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'Oversikt', exact: true })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('aside').getByText('Fredrikstad Barbershop Bahar', { exact: true })).toBeVisible();
  await expect(page.locator('aside').getByRole('link', { name: /^Bytt selskap/ })).toHaveCount(0);

  // The account moved from the header into the sidebar: one account menu, not two.
  await expect(page.getByRole('button', { name: 'Brukermeny' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Konto: / }).click();
  await expect(page.getByRole('menuitem', { name: 'Logg ut' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/user/company-context');
  await expect(page).toHaveURL(`${baseURL}/`);
});

test('phone: ≡ opens the menu, it closes with a 44 px button, and the bottom menu marks the section', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${baseURL}/company/booking`, { waitUntil: 'networkidle' });

  const bottom = page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' });
  await expect(bottom.getByRole('link', { name: 'Booking', exact: true })).toHaveAttribute('aria-current', 'page');

  // A plain ≡ icon top left (no initials), with a 44 px tap target.
  const openMenu = page.getByRole('button', { name: 'Åpne meny' });
  await expect(openMenu).toHaveText('');
  const openSize = await openMenu.boundingBox();
  expect(openSize?.x).toBeLessThan(20);
  expect(openSize?.width).toBeGreaterThanOrEqual(44);
  expect(openSize?.height).toBeGreaterThanOrEqual(44);

  await openMenu.click();
  const menu = page.getByRole('dialog');
  await expect(menu.getByRole('link', { name: 'Booking', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(menu.getByRole('link', { name: 'Logg ut' })).toBeVisible();
  await expect(menu.getByRole('link', { name: /^Bytt selskap/ })).toHaveCount(0);
  const close = menu.getByRole('button', { name: 'Lukk navigasjon' });
  const size = await close.boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(44);
  expect(size?.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(menu).toBeHidden();

  await bottom.getByRole('link', { name: 'Oversikt', exact: true }).click();
  await expect(bottom.getByRole('link', { name: 'Oversikt', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('a single-company user without an active company skips the company picker', async ({ page, context, request }) => {
  const signIn = await request.post(`${backendUrl}/base-service/auth/sign-in`, {
    data: { provider: 'LOCAL', emailOrMobile: e2eAdmin.email, password: e2eAdmin.password },
  });
  await expect(signIn).toBeOK();
  const { accessToken } = (await signIn.json()).data.authTokens;
  await context.addCookies([{ name: 'access_token', value: await portalCookieValue(accessToken), url: baseURL }]);

  await page.goto('/user/company-context?returnTo=%2Fcompany%2Fbooking');
  await expect(page).toHaveURL(`${baseURL}/company/booking`);
  await expect(page.getByRole('navigation', { name: 'Hovednavigasjon' })).toBeVisible();
});
