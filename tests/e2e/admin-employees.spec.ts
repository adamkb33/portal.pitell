import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Ansatte (approved sketch 2026-11-14): one list card with search, pending invitations under "Venter på svar", then
 * the employees; "Inviter ansatt" is the page's create action. ui-rules: every screen we build gets an e2e test.
 */

const INVITE_EMAIL = 'ansatte-e2e@booking.e2e.invalid';
// The backend reads the invite's roles from its token: base64url JSON of { payload, nonce }.
const INVITE_TOKEN = Buffer.from(
  JSON.stringify({ payload: { roles: [], companyRoles: ['EMPLOYEE'] }, nonce: 'ansatte-e2e' }),
).toString('base64url');

// A second employee in the e2e company (the list leaves out the signed-in admin).
const EMPLOYEE_EMAIL = 'rediger-ansatt-e2e@booking.e2e.invalid';
const EMPLOYEE_NAME = 'Emma Vik';
// Sent through the real Inviter ansatt form (the e-mail is only queued in the e2e stack).
const SENT_INVITE_EMAIL = 'inviter-ansatt-e2e@booking.e2e.invalid';

let accessCookie: string;

async function seedEmployee(db: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) {
  await removeEmployee(db);
  await db.query(
    `with u as (insert into base.users (given_name, family_name, email) values ('Emma', 'Vik', $1) returning id)
     insert into base.company_roles (company_id, user_id, role_name) select 1, id, 'EMPLOYEE' from u`,
    [EMPLOYEE_EMAIL],
  );
}

async function removeEmployee(db: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) {
  await db.query(`delete from base.company_roles where user_id in (select id from base.users where email = $1)`, [
    EMPLOYEE_EMAIL,
  ]);
  await db.query(`delete from base.users where email = $1`, [EMPLOYEE_EMAIL]);
}

test.beforeAll(async ({ request }) => {
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

// A fresh pending invitation for every test (one of them withdraws it).
test.beforeEach(async ({ db }) => {
  await db.query(`delete from base.company_invite_tokens where email = $1`, [INVITE_EMAIL]);
  await db.query(
    `insert into base.company_invite_tokens (email, token, expires_at, company_id) values ($1, $2, now() + interval '7 days', 1)`,
    [INVITE_EMAIL, INVITE_TOKEN],
  );
});

test.afterAll(async ({ db }) => {
  await db.query(`delete from base.company_invite_tokens where email = any($1)`, [[INVITE_EMAIL, SENT_INVITE_EMAIL]]);
  await db.query(`delete from notification.notification_deliveries where recipient_address = $1`, [SENT_INVITE_EMAIL]);
  await removeEmployee(db);
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: from Administrasjon to Ansatte, invitations first, search, invite`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });

    // The card counts what the list shows.
    const card = page.getByRole('link', { name: /^Ansatte/ });
    const cardCount = Number((await card.innerText()).match(/(\d+)\s*ansatte?/)?.[1]);
    await card.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);

    const list = page.getByRole('region', { name: 'Ansatte', exact: true });
    await expect(list.locator('p').last()).toHaveText(`${cardCount} ${cardCount === 1 ? 'ansatt' : 'ansatte'}`);

    const invites = list.getByRole('region', { name: 'Venter på svar' });
    await expect(invites).toContainText(INVITE_EMAIL);
    await expect(invites).toContainText('Venter');

    // No buttons inside rows; employee rows open the person.
    await expect(list.getByRole('button', { name: /Slett|Trekk tilbake/ })).toHaveCount(0);
    const employees = list.getByRole('region', { name: 'Ansatte', exact: true }).getByRole('link');
    if ((await employees.count()) > 0) {
      await expect(employees.first()).toHaveAttribute('href', /\/company\/admin\/employees\/edit\?userId=\d+$/);
    }

    // Search narrows both groups; a miss offers to clear it.
    const search = list.getByRole('textbox', { name: 'Søk etter navn eller e-post' });
    await search.fill('ansatte-e2e');
    await expect(invites).toContainText(INVITE_EMAIL);
    await search.fill('finnes-ikke-xyz');
    await expect(list).toContainText('Ingen treff på «finnes-ikke-xyz»');
    await list.getByRole('button', { name: 'Tøm søk' }).first().click();
    await expect(invites).toBeVisible();

    // One create action: the toolbar button on desktop, the button above the bottom menu on phones.
    if (device === 'phone') {
      await expect(page.getByRole('link', { name: 'Tilbake til Administrasjon', exact: true })).toBeVisible();
    }
    await page.getByRole('link', { name: 'Inviter ansatt', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees/invite`);
  });
}

/**
 * Rediger ansatt (approved sketch 2026-11-14): the person on top, roles as selection rows, Lagre with a toast, and
 * "Fjern fra selskapet" below the card behind a confirm dialog.
 */
for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: open an employee, change the role, save, then remove them`, async ({ page, db }) => {
    await seedEmployee(db);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin/employees`, { waitUntil: 'networkidle' });

    const list = page.getByRole('region', { name: 'Ansatte', exact: true });
    const row = list.getByRole('link').filter({ hasText: EMPLOYEE_NAME });
    await expect(row).toContainText(`Ansatt · ${EMPLOYEE_EMAIL}`);
    await row.click();
    await expect(page).toHaveURL(/\/company\/admin\/employees\/edit\?userId=\d+$/);

    // The header names the person; the e-mail is shown, not an input.
    if (device === 'phone') {
      await expect(page.getByRole('banner')).toContainText(EMPLOYEE_NAME);
      await expect(page.getByRole('link', { name: 'Tilbake til Ansatte', exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeHidden();
    } else {
      await expect(page.getByRole('navigation', { name: 'Brødsmuler' })).toContainText(EMPLOYEE_NAME);
    }
    await expect(page.getByText(EMPLOYEE_EMAIL)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'E-postadresse' })).toHaveCount(0);

    // No role: Lagre is disabled and the bar says why (ui-rules, rule 5).
    const lagre = page.getByRole('button', { name: 'Lagre', exact: true });
    await page.getByRole('checkbox', { name: /Ansatt/ }).click();
    await expect(lagre).toBeDisabled();
    await expect(page.getByText('Velg minst én rolle', { exact: true })).toBeVisible();

    await page.getByRole('checkbox', { name: /Administrator/ }).click();
    await expect(lagre).toBeEnabled();
    await lagre.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);
    await expect(page.getByRole('status').filter({ hasText: 'Ansatt lagret' })).toBeVisible();
    await expect(row).toContainText(`Administrator · ${EMPLOYEE_EMAIL}`);

    await row.click();
    await page.getByRole('button', { name: 'Fjern fra selskapet' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText(`Fjern ${EMPLOYEE_NAME}?`);
    await expect(dialog.getByRole('button', { name: 'Behold' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Fjern ansatt' }).click();

    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);
    await expect(page.getByRole('status').filter({ hasText: 'Ansatt fjernet' })).toBeVisible();
    await expect(row).toHaveCount(0);
  });
}

/**
 * A pending invitation's page (approved sketch 2026-11-14): the e-mail, "Venter på svar", the role, and "Trekk
 * tilbake invitasjonen" behind a confirm dialog.
 */
for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: open a pending invitation and withdraw it`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin/employees`, { waitUntil: 'networkidle' });

    const invites = page.getByRole('region', { name: 'Venter på svar' });
    await invites.getByRole('link').filter({ hasText: INVITE_EMAIL }).click();
    await expect(page).toHaveURL(/\/company\/admin\/employees\/invitation\?id=\d+$/);

    const card = page.getByRole('region', { name: 'Invitasjon', exact: true });
    await expect(card).toContainText(INVITE_EMAIL);
    await expect(card).toContainText('Venter på svar');
    await expect(card).toContainText('Ansatt');
    if (device === 'phone') {
      await expect(page.getByRole('link', { name: 'Tilbake til Ansatte', exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Trekk tilbake invitasjonen' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Trekk tilbake invitasjonen?');
    await expect(dialog.getByRole('button', { name: 'Behold' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Trekk tilbake', exact: true }).click();

    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);
    await expect(page.getByRole('status').filter({ hasText: 'Invitasjon trukket tilbake' })).toBeVisible();
    await expect(page.getByText(INVITE_EMAIL)).toHaveCount(0);
  });
}

/**
 * Inviter ansatt (approved sketch 2026-11-14): "Ansatt" chosen from the start, and "Send invitasjon" disabled with one
 * line saying what's missing until the form is valid (ui-rules, rule 5).
 */
for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: invite an employee; the button waits for a valid form`, async ({ page, db }) => {
    await db.query(`delete from base.company_invite_tokens where email = $1`, [SENT_INVITE_EMAIL]);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin/employees`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Inviter ansatt', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees/invite`);
    if (device === 'phone') {
      await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeHidden();
    }

    const send = page.getByRole('button', { name: 'Send invitasjon', exact: true });
    await expect(page.getByRole('checkbox', { name: /Ansatt/ })).toBeChecked();
    await expect(send).toBeDisabled();
    await expect(page.getByText('Skriv inn en gyldig e-postadresse', { exact: true })).toBeVisible();

    const email = page.getByRole('textbox', { name: 'E-postadresse' });
    await email.fill('inviter-ansatt-e2e@');
    await expect(send).toBeDisabled();
    await email.fill(SENT_INVITE_EMAIL);
    await expect(send).toBeEnabled();

    await page.getByRole('checkbox', { name: /Ansatt/ }).click();
    await expect(send).toBeDisabled();
    await expect(page.getByText('Velg minst én rolle', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: /Ansatt/ }).click();

    await send.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/employees`);
    await expect(page.getByRole('status').filter({ hasText: 'Invitasjon sendt' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Venter på svar' })).toContainText(SENT_INVITE_EMAIL);
  });
}
