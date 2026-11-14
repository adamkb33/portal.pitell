import { expect, test } from '../e2e-booking/fixtures';
import { frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';

/**
 * Administrasjon → Statistikk (approved sketch 2026-11-14): Tilgang (who has access, who to follow up) and Kontakter
 * (how many can get SMS or e-mail). Nothing that is 0 is shown. ui-rules: every screen we build gets an e2e test.
 */

const DOMAIN = 'statistikk.e2e.invalid';
const INACTIVE_EMAIL = `ola.inaktiv@${DOMAIN}`;
const EXPIRED_EMAIL = `utlopt@${DOMAIN}`;
const EXPIRED_TOKEN = Buffer.from(
  JSON.stringify({ payload: { roles: [], companyRoles: ['EMPLOYEE'] }, nonce: 'statistikk-e2e' }),
).toString('base64url');

let accessCookie: string;

async function cleanUp(db: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) {
  await db.query(`delete from base.company_roles where user_id in (select id from base.users where email like $1)`, [
    `%@${DOMAIN}`,
  ]);
  await db.query(`delete from base.users where email like $1`, [`%@${DOMAIN}`]);
  await db.query(`delete from base.company_invite_tokens where email like $1`, [`%@${DOMAIN}`]);
  await db.query(`delete from base.company_contacts where email like $1 or given_name = 'Uten'`, [`%@${DOMAIN}`]);
}

test.beforeAll(async ({ db, request }) => {
  await cleanUp(db);
  // Someone with access who has never signed in.
  await db.query(
    `with u as (insert into base.users (given_name, family_name, email) values ('Ola', 'Inaktiv', $1) returning id)
     insert into base.company_roles (company_id, user_id, role_name) select 1, id, 'EMPLOYEE' from u`,
    [INACTIVE_EMAIL],
  );
  // An invitation that ran out.
  await db.query(
    `insert into base.company_invite_tokens (email, token, expires_at, company_id, created_at)
     values ($1, $2, now() - interval '2 days', 1, now() - interval '9 days')`,
    [EXPIRED_EMAIL, EXPIRED_TOKEN],
  );
  // Contacts: reachable by both, by SMS only, and by neither.
  await db.query(
    `insert into base.company_contacts (company_id, given_name, family_name, email, mobile_number) values
     (1, 'Begge', 'Kanaler', $1, '+4791111111'),
     (1, 'Bare', 'Mobil', null, '+4792222222'),
     (1, 'Uten', 'Kontaktinfo', null, null)`,
    [`begge@${DOMAIN}`],
  );
  accessCookie = await portalCookieValue(await signInAsCompanyAdmin(request));
});

test.afterAll(async ({ db }) => {
  await cleanUp(db);
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);
});

for (const [device, width] of [
  ['desktop', 1440],
  ['phone', 375],
] as const) {
  test(`${device}: Tilgang and Kontakter lead to what needs doing`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/company/admin`, { waitUntil: 'networkidle' });
    const statistikk = page.getByRole('navigation', { name: 'Administrasjon', exact: true }).getByRole('link', {
      name: /^Statistikk/,
    });
    await expect(statistikk).toContainText(/\d+ å følge opp/);
    await statistikk.click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/statistics`);

    const access = page.getByRole('region', { name: 'Tilgang' });
    await expect(access).toContainText('Har tilgang');
    await expect(access).toContainText(/administrator/);
    await expect(access).toContainText('Ikke logget inn på 30 dager');

    const followUp = access.getByRole('region', { name: /^Følg opp/ });
    await expect(followUp.getByRole('link').filter({ hasText: 'Ola Inaktiv' })).toContainText('Aldri logget inn');
    const expired = followUp.getByRole('link').filter({ hasText: EXPIRED_EMAIL });
    await expect(expired).toContainText('Utløpt');

    const contacts = page.getByRole('region', { name: 'Kontakter' });
    await expect(contacts).toContainText('Kan få SMS');
    await expect(contacts).toContainText('Kan få e-post');

    await page.screenshot({ path: testInfo.outputPath(`statistikk-${device}.png`), fullPage: true });

    // Nothing that is 0 is shown (ui-rules, rule 1).
    await expect(page.locator('dd').filter({ hasText: /^0$/ })).toHaveCount(0);
    await expect(page.getByText(/Aktive sesjoner|Produkter|Passordreset/)).toHaveCount(0);

    // The contacts without mobile and e-mail: the list filtered to them, with a way to clear it.
    await contacts.getByRole('link', { name: /uten mobil og e-post/ }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts?vis=uten-kontaktinfo`);
    const list = page.getByRole('region', { name: 'Kontakter', exact: true });
    await expect(list.getByRole('link').filter({ hasText: 'Uten Kontaktinfo' })).toBeVisible();
    await expect(list.getByRole('link').filter({ hasText: 'Bare Mobil' })).toHaveCount(0);
    await list.getByRole('button', { name: 'Fjern filteret Uten mobil og e-post' }).click();
    await expect(page).toHaveURL(`${baseURL}/company/admin/contacts`);

    // An expired invitation opens Inviter ansatt with the e-mail filled in.
    await page.goto(`${baseURL}/company/admin/statistics`, { waitUntil: 'networkidle' });
    await page.getByRole('link').filter({ hasText: EXPIRED_EMAIL }).click();
    await expect(page).toHaveURL(/\/company\/admin\/employees\/invite\?email=/);
    await expect(page.getByRole('textbox', { name: 'E-postadresse' })).toHaveValue(EXPIRED_EMAIL);
    await expect(page.getByRole('button', { name: 'Send invitasjon', exact: true })).toBeEnabled();

    // The person who never signed in opens Rediger ansatt.
    await page.goto(`${baseURL}/company/admin/statistics`, { waitUntil: 'networkidle' });
    await page.getByRole('link').filter({ hasText: 'Ola Inaktiv' }).click();
    await expect(page).toHaveURL(/\/company\/admin\/employees\/edit\?userId=\d+$/);
  });
}
