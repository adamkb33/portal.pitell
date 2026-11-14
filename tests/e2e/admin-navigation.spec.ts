import type { Page } from '@playwright/test';
import { expect, seedAppointmentHistory, test } from '../e2e-booking/fixtures';
import { accessTokenCookie } from '../../app/routes/auth/_features/auth.cookies.server';
import { backendUrl as gatewayURL, frontendUrl as baseURL } from '../../scripts/e2e/stack';
let accessCookie: string;

/** One level up: the header ‹ on phones, the breadcrumb on desktop (ui-rules → Page top). */
async function goUp(page: Page, mobile: boolean, label: string) {
  if (mobile) {
    await page.getByRole('link', { name: `Tilbake til ${label}`, exact: true }).click();
  } else {
    await page.getByRole('navigation', { name: 'Brødsmuler' }).getByRole('link', { name: label, exact: true }).click();
  }
}

test.beforeAll(async ({ db }) => {
  await seedAppointmentHistory(db);
});

test.beforeAll(async ({ request }) => {
  const signIn = await request.post(`${gatewayURL}/base-service/auth/sign-in`, {
    data: {
      provider: 'LOCAL',
      emailOrMobile: process.env.E2E_COMPANY_USER_EMAIL,
      password: process.env.E2E_COMPANY_USER_PASSWORD,
    },
  });
  await expect(signIn, 'The configured E2E user must be able to sign in.').toBeOK();
  const signInData = (await signIn.json()).data;
  expect(signInData.nextStep).toBe('DONE');
  const token = signInData.authTokens.accessToken;
  const contexts = await request.get(`${gatewayURL}/base-service/auth/company-contexts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(contexts.ok()).toBe(true);
  const companies = (await contexts.json()).data;
  const companyId = Number(process.env.E2E_COMPANY_ID) || companies[0]?.id;
  expect(companyId).toBeTruthy();
  const companySignIn = await request.post(`${gatewayURL}/base-service/auth/company-sign-in`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { companyId },
  });
  expect(companySignIn.ok()).toBe(true);
  const companyToken = (await companySignIn.json()).data.accessToken;
  accessCookie = (await accessTokenCookie.serialize(companyToken)).split(';')[0].slice('access_token='.length);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  const mobile = viewport.width < 1024;
  test(`${mobile ? 'mobile' : 'desktop'}: main destination → admin index → employees → invite → back`, async ({
    page,
    context,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Administrasjon', exact: true })).toBeVisible();

    const adminPages = page.getByRole('navigation', { name: 'Administrasjon', exact: true });
    await expect(page.getByText('Totalt brukere', { exact: true })).toHaveCount(0);
    await adminPages.getByRole('link', { name: /^Statistikk/ }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/statistics`);
    await expect(page.getByRole('heading', { name: 'Statistikk', exact: true })).toBeVisible();
    await expect(page.getByText('Totalt brukere', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Tilbake til administrasjon', exact: true }).click();

    const bottom = page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' });
    const sidebar = page.getByRole('navigation', { name: 'Hovednavigasjon', exact: true });
    if (mobile) {
      await expect(bottom.getByRole('link')).toContainText(['Oversikt', 'Booking', 'Timelister']);
      await expect(bottom.getByRole('button', { name: 'Mer', exact: true })).toHaveCount(0);
      await expect(bottom.getByRole('link', { name: 'Ansatte', exact: true })).toHaveCount(0);
      await bottom.getByRole('link', { name: 'Booking', exact: true }).click();
    } else {
      await expect(sidebar.getByRole('link', { name: 'Ansatte', exact: true })).toHaveCount(0);
      await expect(sidebar.getByRole('link', { name: 'Innstillinger', exact: true })).toHaveCount(0);
      await sidebar.getByRole('link', { name: 'Booking', exact: true }).click();
    }
    await expect(page).toHaveURL(`${baseURL}/company/booking`);
    const bookingAreas = page.getByRole('navigation', { name: 'Booking', exact: true });
    await expect(bookingAreas.getByRole('link', { name: /^Administrasjon/ })).toHaveCount(0);
    await bookingAreas.getByRole('link', { name: /^Tjenester\b/ }).click();
    await expect(page).toHaveURL(`${baseURL}/company/booking/admin/services`);
    await goUp(page, mobile, 'Booking');
    await expect(bookingAreas).toBeVisible();
    await expect(page.getByRole('region', { name: /^Tall for / })).toHaveCount(0);
    await bookingAreas.getByRole('link', { name: /^Statistikk\b/ }).click();
    await expect(page).toHaveURL(`${baseURL}/company/booking/statistics`);
    await expect(page.getByRole('heading', { name: 'Statistikk', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: /^Tall for / })).toContainText('Omsetning');
    await goUp(page, mobile, 'Booking');
    await expect(page).toHaveURL(`${baseURL}/company/booking`);
    if (mobile) {
      await page.getByRole('button', { name: 'Åpne meny', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Navigasjon', exact: true });
      await expect(drawer.getByRole('link', { name: 'Ansatte', exact: true })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath('mobile-drawer.png') });
      await drawer.getByRole('link', { name: 'Administrasjon', exact: true }).click();
      await expect(drawer).toBeHidden();
    } else {
      await sidebar.getByRole('link', { name: 'Administrasjon', exact: true }).click();
    }

    await expect(page).toHaveURL(`${baseURL}/company/admin`);
    await page.screenshot({ path: testInfo.outputPath('admin-index.png'), fullPage: true });
    await page.getByRole('link', { name: /^Ansatte/ }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);
    if (!mobile) {
      await expect(
        page
          .getByRole('navigation', { name: 'Hovednavigasjon', exact: true })
          .getByRole('link', { name: 'Administrasjon', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }
    // The page's create: the toolbar button on desktop, the bottom menu's + on phones.
    await page.getByRole('link', { name: 'Inviter ansatt', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees/invite`);
    await expect(page.getByRole('heading', { name: 'Inviter ansatt', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'E-postadresse' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('invite-page.png'), fullPage: true });
    await goUp(page, mobile, 'Ansatte');
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('region', { name: 'Ansatte', exact: true })).toBeVisible();
    // Below a section the header shows ‹ instead of the menu.
    if (mobile) await expect(page.getByRole('button', { name: 'Åpne meny', exact: true })).toHaveCount(0);
    await goUp(page, mobile, 'Administrasjon');
    await expect(page).toHaveURL(`${baseURL}/company/admin`);
    await expect(adminPages).toBeVisible();
  });
}

test('appointments: open an appointment on its own page, go back, paginate, search and keep the search', async ({
  page,
  context,
}, testInfo) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    `${baseURL}/company/booking/appointments?toDateTime=${encodeURIComponent(new Date().toISOString())}&direction=DESC&page=0`,
  );
  const list = page.getByRole('region', { name: 'Timebestillingsliste' });
  const rows = list.getByRole('list').getByRole('link');
  await expect(rows.nth(1), 'The E2E company needs at least two appointments.').toBeVisible();
  const selectedName = (await rows.nth(1).locator('span.truncate.font-semibold').innerText()).trim();
  const listUrl = page.url();

  // A row opens the appointment's own page, not a panel next to the list.
  await rows.nth(1).click();
  await expect(page).toHaveURL(/\/company\/booking\/appointments\/\d+$/);
  await expect(page.getByRole('heading', { name: selectedName, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Last opp bilde' })).toHaveAttribute('href', /\?id=\d+$/);
  await page.screenshot({ path: testInfo.outputPath('appointment-detail-desktop.png'), fullPage: true });
  // Up (the breadcrumb here) returns to the list as it was left.
  await goUp(page, false, 'Timebestillinger');
  await expect(page).toHaveURL(listUrl);

  if (await list.getByRole('button', { name: 'Neste side', exact: true }).isEnabled()) {
    await list.getByRole('button', { name: 'Neste side', exact: true }).click();
    await expect(page).toHaveURL(/page=1/);
    await list.getByRole('button', { name: 'Forrige side', exact: true }).click();
    await expect(page).toHaveURL(/page=0/);
  }

  await list.getByRole('textbox', { name: 'Søk etter kunde' }).fill(selectedName);
  await expect(page).toHaveURL(/search=/);
  await expect(rows.first()).toContainText(selectedName);

  await page.setViewportSize({ width: 390, height: 844 });
  const filteredURL = page.url();
  await rows.first().click();
  await expect(page).toHaveURL(/\/company\/booking\/appointments\/\d+$/);
  await expect(page.getByRole('heading', { name: selectedName, exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('appointment-detail-mobile.png'), fullPage: true });
  const detailURL = page.url();
  // Last opp bilde belongs to this appointment, so its ‹ goes back to it.
  await page.getByRole('link', { name: 'Last opp bilde' }).click();
  await expect(page).toHaveURL(/\/appointments\/upload-image\?id=\d+$/);
  await goUp(page, true, 'Timebestilling');
  await expect(page).toHaveURL(detailURL);
  await goUp(page, true, 'Timebestillinger');
  await expect(page).toHaveURL(filteredURL);
  await expect(list.getByRole('textbox', { name: 'Søk etter kunde' })).toHaveValue(selectedName);
});

// Ny time (customer → services → time → Book time) is tested in booking-new-appointment.spec.ts.
