import { expect, type Page } from '@playwright/test';

export type GuestContact = {
  givenName: string;
  familyName: string;
  mobileNumber: string;
  email?: string;
};

/** Services seeded by seedBookingFixture, one per service group. */
export const SEEDED_SERVICES = ['Hårklipp', 'Vask og styling', 'Skjeggtrim'] as const;

export async function selectBookingDetails(page: Page, serviceNames: readonly string[]) {
  await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
  // Company 1 has a single booking profile, so the employee step auto-selects and redirects.
  await page.waitForURL(/\/select-services/);
  await selectServicesAndTime(page, serviceNames);
}

/** Everything from the service list onwards, once a provider is settled. */
export async function selectServicesAndTime(page: Page, serviceNames: readonly string[]) {
  await selectServices(page, serviceNames);
  await pickFirstAvailableTime(page);
}

export async function selectServices(page: Page, serviceNames: readonly string[]) {
  for (const serviceName of serviceNames) {
    await page.getByRole('checkbox', { name: serviceName }).check();
  }
}

export async function pickFirstAvailableTime(page: Page) {
  await page.getByRole('button', { name: 'Velg tid', exact: true }).click();
  await page.waitForURL(/\/select-time/);
  await page.getByRole('button', { name: /Første ledige tid/ }).click();
  await page.getByRole('link', { name: 'Fortsett', exact: true }).click();
  // An already verified user skips the contact step entirely.
  await page.waitForURL(/\/(contact|overview)(?:[?/]|$)/);
}

/** Fills and submits the contact form without waiting for what comes next (SMS step, overview or an error). */
export async function submitContactForm(page: Page, contact: GuestContact) {
  await page.getByLabel('Fornavn').fill(contact.givenName);
  await page.getByLabel('Etternavn').fill(contact.familyName);
  await page.getByLabel('Mobilnummer').fill(contact.mobileNumber);
  if (contact.email) {
    // The email field is revealed by an optional toggle.
    await page.getByRole('button', { name: /Legg til e-post/ }).click();
    await page.getByLabel('E-post').fill(contact.email);
  }
  await page.getByRole('button', { name: /Lagre og fortsett/ }).click();
}

/** Submits the contact form and waits for the SMS verification step. */
export async function fillContactForm(page: Page, contact: GuestContact) {
  await submitContactForm(page, contact);
  await page.waitForURL(/\/contact\/verify-mobile/);
}

export async function submitVerificationCode(page: Page, code: string) {
  const input = page.getByRole('textbox', { name: 'Engangskode' });
  await input.fill(code);
  await expect(input).toHaveValue(code);
  await page.getByRole('button', { name: /Bekreft mobilnummer/ }).click();
}

/** Submits a code that is expected to be rejected, and waits for the error to render. */
export async function submitInvalidVerificationCode(page: Page, code: string) {
  await submitVerificationCode(page, code);
  await expect(page.getByRole('alert')).toContainText('Feil kode.');
}

export async function completeGuestContact(page: Page, contact: GuestContact) {
  await fillContactForm(page, contact);
  await submitVerificationCode(page, '111111');
  await page.waitForURL(/\/overview/);
}

/** Ticks the terms box on the overview step. A customer who already accepted the current terms is not asked again. */
export async function acceptTerms(page: Page) {
  await expect(page.getByRole('button', { name: /Bekreft timebestilling/ })).toBeVisible();
  const terms = page.getByRole('checkbox', { name: /Jeg godtar/ });
  if ((await terms.count()) > 0) {
    await terms.check();
  }
}
