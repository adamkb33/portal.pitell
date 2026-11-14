import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Kontakter (approved sketch 2026-11-14): one list card with search, contacts A–Å by first name under letter strips,
 * 10 per page with a count and pager, rows that open the contact, and "Ny kontakt" as the page's create action.
 * ui-rules: every screen we build gets an e2e test of its flow.
 */

const DOMAIN = 'kontakter.e2e.invalid';
// 12 contacts so the search for this domain fills one page of 10 and spills onto a second.
const NAMES = [
  ['Aksel', 'Berg'],
  ['Anna', 'Dahl'],
  ['Bjørn', 'Eide'],
  ['Cecilie', 'Fjeld'],
  ['Dina', 'Gran'],
  ['Erik', 'Holm'],
  ['Frida', 'Isaksen'],
  ['Geir', 'Jensen'],
  ['Hanne', 'Krogh'],
  ['Ivar', 'Lie'],
  ['Jonas', 'Moe'],
  ['Kari', 'Nygård'],
] as const;

// Its own contact for the edit flow, so changing and deleting it never touches the list above.
const EDIT_DOMAIN = 'rediger-kontakt.e2e.invalid';
const NEW_DOMAIN = 'ny-kontakt.e2e.invalid';

let accessCookie: string;

test.beforeAll(async ({ db, request }) => {
  await db.query(`delete from base.company_contacts where email like $1`, [`%@${DOMAIN}`]);
  for (const [index, [given, family]] of NAMES.entries()) {
    await db.query(
      `insert into base.company_contacts (company_id, given_name, family_name, email, mobile_number) values (1, $1, $2, $3, $4)`,
      [given, family, `${given.toLowerCase()}@${DOMAIN}`, index === 0 ? '+4791234567' : null],
    );
  }
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.afterAll(async ({ db }) => {
  await db.query(`delete from base.company_contacts where email like any($1)`, [
    [`%@${DOMAIN}`, `%@${EDIT_DOMAIN}`, `%@${NEW_DOMAIN}`],
  ]);
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: search, letter strips, paging, open a contact and come back`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /^Kontakter/ }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts`);

    const list = page.getByRole('region', { name: 'Kontakter', exact: true });
    await list.getByRole('textbox', { name: 'Søk etter navn, e-post eller mobil' }).fill(DOMAIN);
    await expect(page).toHaveURL(/search=kontakter\.e2e\.invalid/);
    await expect(list).toContainText('12 kontakter');

    // A–Å by first name, under letter strips; 10 on the first page.
    const rows = list.getByRole('listitem').getByRole('link');
    await expect(rows).toHaveCount(10);
    await expect(rows.first()).toContainText('Aksel Berg');
    await expect(rows.first()).toContainText(`912 34 567 · aksel@${DOMAIN}`);
    // A strip names its letter and how many on this page have it.
    await expect(list.getByRole('heading', { name: /^A\s*2 kontakter$/ })).toBeVisible();
    await expect(list.getByRole('heading', { name: /^B\s*1 kontakt$/ })).toBeVisible();
    await expect(list.getByRole('button', { name: /Slett/ })).toHaveCount(0);

    await list.getByRole('button', { name: 'Neste side' }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Jonas Moe');
    const listUrl = page.url();

    // A row opens the contact; up returns to the same search and page.
    await rows.filter({ hasText: 'Kari Nygård' }).click();
    await expect(page).toHaveURL(/\/company\/admin\/contacts\/edit\?contactId=\d+&returnTo=/);
    if (device === 'phone') {
      await page.getByRole('link', { name: 'Tilbake til Kontakter', exact: true }).click();
    } else {
      await page
        .getByRole('navigation', { name: 'Brødsmuler' })
        .getByRole('link', { name: 'Kontakter', exact: true })
        .click();
    }
    await expect(page).toHaveURL(listUrl);

    // A miss offers to clear the search.
    await list.getByRole('textbox', { name: 'Søk etter navn, e-post eller mobil' }).fill('finnes-ikke-xyz');
    await expect(list).toContainText('Ingen treff på «finnes-ikke-xyz»');

    await page.getByRole('link', { name: 'Ny kontakt', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts/create`);
  });
}

/**
 * Rediger kontakt (approved sketch 2026-11-14): Lagre disabled with one line saying what's missing until the form is
 * valid, "Kontakt lagret" back on the list as it was left, and "Slett kontakt" behind a confirm dialog.
 */
for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: edit a contact, save, then delete it`, async ({ page, db }) => {
    await db.query(`delete from base.company_contacts where email like $1`, [`%@${EDIT_DOMAIN}`]);
    await db.query(
      `insert into base.company_contacts (company_id, given_name, family_name, email, mobile_number) values (1, 'Lise', 'Lunde', $1, '+4791234500')`,
      [`lise@${EDIT_DOMAIN}`],
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin/contacts?search=${EDIT_DOMAIN}`, { waitUntil: 'networkidle' });
    const listUrl = page.url();

    const list = page.getByRole('region', { name: 'Kontakter', exact: true });
    await list.getByRole('link').filter({ hasText: 'Lise Lunde' }).click();
    await expect(page).toHaveURL(/\/company\/admin\/contacts\/edit\?/);
    // The header names the contact, not "Rediger kontakt".
    if (device === 'phone') {
      await expect(page.getByRole('banner')).toContainText('Lise Lunde');
      await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeHidden();
    } else {
      await expect(page.getByRole('navigation', { name: 'Brødsmuler' })).toContainText('Lise Lunde');
    }

    const lagre = page.getByRole('button', { name: 'Lagre', exact: true });
    const fornavn = page.getByRole('textbox', { name: 'Fornavn' });
    const mobil = page.getByRole('textbox', { name: 'Mobil (valgfritt)' });
    await expect(lagre).toBeEnabled();

    // Lagre waits for a valid form and says what's missing (ui-rules, rule 5).
    await fornavn.fill('');
    await expect(lagre).toBeDisabled();
    await expect(page.getByText('Skriv inn fornavn', { exact: true })).toBeVisible();
    await fornavn.fill('Lisa');
    await mobil.fill('912 34');
    await expect(lagre).toBeDisabled();
    await expect(page.getByText('Skriv inn et gyldig mobilnummer', { exact: true })).toBeVisible();
    await mobil.fill('912 34 599');
    await expect(lagre).toBeEnabled();
    await lagre.click();

    await expect(page).toHaveURL(listUrl);
    await expect(page.getByRole('status').filter({ hasText: 'Kontakt lagret' })).toBeVisible();
    const row = list.getByRole('link').filter({ hasText: 'Lisa Lunde' });
    await expect(row).toContainText('912 34 599');

    await row.click();
    await page.getByRole('button', { name: 'Slett kontakt' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Slett Lisa Lunde?');
    await expect(dialog.getByRole('button', { name: 'Behold' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Slett kontakt' }).click();

    await expect(page).toHaveURL(listUrl);
    await expect(page.getByRole('status').filter({ hasText: 'Kontakt slettet' })).toBeVisible();
    await expect(list).toContainText(`Ingen treff på «${EDIT_DOMAIN}»`);
  });
}

/**
 * Ny kontakt (approved sketch 2026-11-14): the same form as Rediger kontakt without delete; after Lagre you're back on
 * the plain list with "Kontakt lagret".
 */
for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: create a contact and land on it`, async ({ page, db }) => {
    const email = `sara.${device}@${NEW_DOMAIN}`;
    await db.query(`delete from base.company_contacts where email = $1`, [email]);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin/contacts`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Ny kontakt', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts/create`);

    if (device === 'phone') {
      await expect(page.getByRole('banner')).toContainText('Ny kontakt');
      await expect(page.getByRole('link', { name: 'Tilbake til Kontakter', exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: 'Brødsmuler' })).toContainText('Ny kontakt');
    }
    await expect(page.getByRole('button', { name: /^Slett/ })).toHaveCount(0);

    const lagre = page.getByRole('button', { name: 'Lagre', exact: true });
    await expect(lagre).toBeDisabled();
    await expect(page.getByText('Skriv inn fornavn', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Fornavn' }).fill('Sara');
    await expect(page.getByText('Skriv inn etternavn', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Etternavn' }).fill('Holm');
    await page.getByRole('textbox', { name: 'E-post (valgfritt)' }).fill(email);
    await expect(lagre).toBeEnabled();
    await lagre.click();

    // Back to the plain list, no search filled in; the new contact is there when you search for it.
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts`);
    await expect(page.getByRole('status').filter({ hasText: 'Kontakt lagret' })).toBeVisible();
    const list = page.getByRole('region', { name: 'Kontakter', exact: true });
    const search = list.getByRole('textbox', { name: 'Søk etter navn, e-post eller mobil' });
    await expect(search).toHaveValue('');
    await search.fill(email);
    await expect(list.getByRole('link').filter({ hasText: 'Sara Holm' })).toContainText(email);
  });
}
