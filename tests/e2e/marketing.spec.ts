import { expect, test } from '../e2e-booking/fixtures';
import { backendUrl, frontendUrl as baseURL } from '../../scripts/e2e/stack';
import { authHeaders, portalCookieValue, signInAsCompanyAdmin } from './loyalty.helpers';
import {
  addOptedInCustomers,
  addSentMessage,
  cleanMarketingData,
  setMarketingProduct,
  signInAsSystemAdmin,
} from './marketing.helpers';

// The four marketing journeys against the real backend. Delivery is the backend's dry run (nothing leaves the
// machine); start-backend.ts makes its worker send one message per channel per second.

let accessToken: string;
let accessCookie: string;
let systemAdminToken: string;

test.beforeAll(async ({ request, db }) => {
  systemAdminToken = await signInAsSystemAdmin(request, db);
  await setMarketingProduct(request, systemAdminToken, true);
  accessToken = await signInAsCompanyAdmin(request);
  accessCookie = await portalCookieValue(accessToken);
});

test.beforeEach(async ({ db }) => {
  await cleanMarketingData(db);
});

test.afterAll(async ({ request, db }) => {
  await cleanMarketingData(db);
  await setMarketingProduct(request, systemAdminToken, false);
});

const signIn = (context: import('@playwright/test').BrowserContext) =>
  context.addCookies([{ name: 'access_token', value: accessCookie, url: baseURL }]);

test('the admin writes an e-mail in three steps, previews it, leaves a recipient out and sends it', async ({
  page,
  context,
  db,
}) => {
  await signIn(context);
  const [kari] = await addOptedInCustomers(db, 'EMAIL', 2);
  await addOptedInCustomers(db, 'SMS', 1);
  await page.goto(`${baseURL}/company/marketing/email/create`, { waitUntil: 'networkidle' });
  const templates = page.getByRole('list', { name: 'Maler' });
  const next = page.getByRole('button', { name: 'Velg mottakere' });

  // 1 Mal: tapping a template goes straight to writing.
  await expect(page.getByText('1 av 3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Kampanjenavn')).toHaveCount(0);
  await templates.getByRole('button', { name: /^Tilbud/ }).click();

  // 2 Skriv: its own page. The bar says what's missing until the e-mail is ready.
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/email\/create\/write$/);
  await expect(next).toBeDisabled();
  await expect(page.getByText('Skriv inn et emne', { exact: true })).toBeVisible();
  await page.getByLabel('Emne', { exact: true }).fill('God jul');
  await page.getByLabel('Overskrift', { exact: true }).fill('Julebooking er åpen');
  await page.getByLabel('Melding', { exact: true }).fill('Vi har åpent i romjulen.');
  await page.getByRole('switch', { name: 'Knapp' }).click();
  await page.getByLabel('Knappetekst', { exact: true }).fill('Bestill time');
  await page.getByLabel('Lenke', { exact: true }).fill('http://pitell.no');
  await expect(page.getByText('Lenken må starte med https://', { exact: true })).toBeVisible();
  await expect(next).toBeDisabled();

  // Desktop: the preview stands beside the form (no scripts in it), and leaves out the unfinished button.
  const sidePreview = page.getByRole('complementary', { name: 'Forhåndsvisning' }).locator('iframe');
  await expect(sidePreview).toHaveAttribute('sandbox', 'allow-same-origin');
  await expect(sidePreview).toHaveAttribute('srcdoc', /Julebooking er åpen[\s\S]*Vi har åpent i romjulen/);
  await expect(sidePreview).not.toHaveAttribute('srcdoc', /Bestill time/);

  // A link written without https:// gets it when the field is left.
  await page.getByLabel('Lenke', { exact: true }).fill('pitell.no');
  await page.getByLabel('Lenke', { exact: true }).blur();
  await expect(page.getByLabel('Lenke', { exact: true })).toHaveValue('https://pitell.no');
  await expect(next).toBeEnabled();
  await expect(sidePreview).toHaveAttribute('srcdoc', /Bestill time/);
  await page.screenshot({ path: 'test-results/marketing-create-email-desktop.png', fullPage: true });

  // The unfinished e-mail survives a reload and opens where the writing is.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Emne', { exact: true })).toHaveValue('God jul');

  // The template changes right here on Skriv, keeps the text and asks nothing.
  await page.getByRole('button', { name: 'Endre mal' }).click();
  await page.getByRole('menuitem', { name: /Personlig melding/ }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Overskrift', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Melding', { exact: true })).toHaveValue('Vi har åpent i romjulen.');
  await page.getByRole('button', { name: 'Endre mal' }).click();
  await page.getByRole('menuitem', { name: /Tilbud/ }).click();
  await expect(page.getByLabel('Overskrift', { exact: true })).toHaveValue('Julebooking er åpen');

  // Phone: no bottom menu, and Forhåndsvis shows the e-mail full screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeHidden();
  // Every step is "Ny e-post" in the header, and up goes to E-post.
  await expect(page.getByRole('link', { name: 'Tilbake til E-post', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/marketing-create-email-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Forhåndsvis' }).click();
  const previewSheet = page.getByRole('dialog', { name: 'Forhåndsvisning' });
  await expect(previewSheet).toContainText('God jul');
  await expect(previewSheet.locator('iframe')).toHaveAttribute('srcdoc', /Julebooking er åpen/);
  await page.screenshot({ path: 'test-results/marketing-email-preview-mobile.png' });
  await previewSheet.getByRole('button', { name: 'Lukk' }).click();
  await expect(previewSheet).toHaveCount(0);

  // 3 Send: the recipients and the e-mail. Back (the phone's back gesture) goes one step, not out of the page.
  await next.click();
  await expect(page.getByText('3 av 3', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/email\/create\/send$/);
  await page.goBack();
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Emne', { exact: true })).toHaveValue('God jul');
  await next.click();
  await expect(page.getByText('3 av 3', { exact: true })).toBeVisible();
  const recipients = page.getByRole('region', { name: 'Mottakere' });
  // Everyone who said yes is one row, and nobody is left out yet: no panel and no long list to scroll.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(recipients).toContainText('Alle som har sagt ja');
  await expect(page.getByRole('region', { name: 'E-posten' })).toContainText('God jul');
  await expect(page.getByRole('button', { name: 'Send til 2 kunder' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/marketing-email-send-mobile.png', fullPage: true });
  // "Ikke send til" finds customers by name or e-mail; picking one leaves them out and empties the field.
  const search = recipients.getByRole('combobox', { name: 'Ikke send til' });
  const matches = recipients.getByRole('listbox', { name: 'Treff' }).getByRole('option');
  const leftOut = recipients.getByRole('list', { name: 'Ikke send til' }).getByRole('listitem');
  await search.fill('kari');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(matches).toHaveCount(2);
  await search.fill('finnes-ikke');
  await expect(recipients.getByText('Ingen treff på «finnes-ikke»')).toBeVisible();
  await search.fill(kari.address);
  await expect(matches).toHaveCount(1);
  await search.press('Enter');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(leftOut).toHaveCount(1);
  await expect(leftOut).toContainText(kari.address);
  await expect(page.getByRole('button', { name: 'Send til 1 kunde' })).toBeEnabled();
  // Someone left out is no longer offered.
  await search.fill('kari');
  await expect(matches).toHaveCount(1);
  await expect(matches).not.toContainText(kari.address);
  // ✕ puts them back; leaving out everyone makes Send wait and say why.
  await leftOut.getByRole('button', { name: /likevel$/ }).click();
  await expect(leftOut).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send til 2 kunder' })).toBeEnabled();
  await search.fill('kari');
  await matches.first().click();
  await search.fill('kari');
  await matches.first().click();
  await expect(leftOut).toHaveCount(2);
  await expect(page.getByText('Velg minst én mottaker', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send til 0 kunder' })).toBeDisabled();
  await leftOut
    .filter({ hasNotText: kari.address })
    .getByRole('button', { name: /likevel$/ })
    .click();
  await expect(leftOut).toHaveCount(1);
  await expect(leftOut).toContainText(kari.address);
  await page.screenshot({ path: 'test-results/marketing-email-recipients-mobile.png' });
  // On phones the e-mail is one row; the eye opens it full screen.
  await page.getByRole('button', { name: 'Forhåndsvis' }).click();
  await expect(previewSheet).toContainText('God jul');
  await previewSheet.getByRole('button', { name: 'Lukk' }).click();
  await expect(previewSheet).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Send til 1 kunde' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Send «God jul» til 1 kunde?');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Send nå' }).click();
  await expect(page).toHaveURL(/\/company\/marketing\/\d+$/);
  const status = page.getByRole('region', { name: 'Status' });
  await expect(status).toContainText('God jul');
  await expect(status.getByText('Fullført', { exact: true })).toBeVisible({ timeout: 30_000 });
  const stored = await db.query<{ body: string; subject: string; count: string }>(
    `select c.body, c.subject, (select count(*) from marketing.marketing_messages m where m.campaign_id = c.id) as count from marketing.marketing_campaigns c where c.company_id = 1 and c.name = 'God jul'`,
  );
  expect(stored.rows[0].count).toBe('1');
  expect(JSON.parse(stored.rows[0].body)).toEqual([
    { type: 'HEADING', text: 'Julebooking er åpen', url: null },
    { type: 'PARAGRAPH', text: 'Vi har åpent i romjulen.', url: null },
    { type: 'BUTTON', text: 'Bestill time', url: 'https://pitell.no' },
  ]);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith('pitell:marketing:email-draft:')),
    ),
  ).toEqual([]);
  // A new e-mail starts by choosing a template, from that template's defaults.
  await page.goto(`${baseURL}/company/marketing/email/create`, { waitUntil: 'networkidle' });
  await expect(page.getByText('1 av 3', { exact: true })).toBeVisible();
  await templates.getByRole('button', { name: /^Personlig melding/ }).click();
  await expect(page.getByLabel('Emne', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Melding', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Overskrift', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Knappetekst', { exact: true })).toHaveCount(0);
  // Changing template keeps the message; the untouched heading takes the new template's default.
  await page.getByLabel('Melding', { exact: true }).fill('En hilsen');
  await page.getByRole('button', { name: 'Endre mal' }).click();
  await page.getByRole('menuitem', { name: /Kunngjøring/ }).click();
  await expect(page.getByLabel('Melding', { exact: true })).toHaveValue('En hilsen');
  await expect(page.getByLabel('Overskrift', { exact: true })).toHaveValue('Vi har nyheter');
});

test('Ny e-post says what is missing field by field, and Send needs a finished e-mail', async ({
  page,
  context,
  db,
}) => {
  await signIn(context);
  await addOptedInCustomers(db, 'EMAIL', 1);
  await page.goto(`${baseURL}/company/marketing/email/create`, { waitUntil: 'networkidle' });
  const templates = page.getByRole('list', { name: 'Maler' });
  const bar = page.locator('[data-floating-action-bar]');
  const next = page.getByRole('button', { name: 'Velg mottakere' });
  const field = (label: string) => page.getByLabel(label, { exact: true });
  // Nothing written yet: no template is marked as in use.
  await expect(templates.locator('button[aria-current]')).toHaveCount(0);
  await templates.getByRole('button', { name: /^Kunngjøring/ }).click();
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();

  // The bar names the first thing that is missing or wrong, and the button waits.
  const missing = async (text: string) => {
    await expect(bar).toContainText(text);
    await expect(next).toBeDisabled();
  };
  await missing('Skriv inn et emne');
  await field('Emne').fill('   ');
  await missing('Skriv inn et emne');
  await field('Emne').fill('Hei {{fornavn}}');
  await missing('Ukjent flettefelt: {{fornavn}}');
  await field('Emne').fill('Hei {{givenName}}');
  await missing('Skriv en melding');
  await field('Overskrift').fill('');
  await missing('Skriv inn en overskrift');
  await field('Overskrift').fill('Åpent i romjulen');
  await field('Melding').fill('   ');
  await missing('Skriv en melding');
  await field('Melding').fill('Hei {{givenName}}, vi har åpent i romjulen.');
  await expect(next).toBeEnabled();
  await expect(bar).not.toContainText('Skriv');

  await page.getByRole('switch', { name: 'Knapp' }).click();
  await missing('Skriv inn en lenke');
  await field('Knappetekst').fill('');
  await field('Lenke').fill('https://pitell.no');
  await missing('Skriv inn knappetekst');
  await field('Knappetekst').fill('Bestill time');
  await expect(next).toBeEnabled();
  await field('Lenke').fill('https://pitell .no');
  await missing('Lenken kan ikke inneholde mellomrom');
  await field('Lenke').fill('https://pitell.no/{{givenName}}');
  await missing('Lenken kan ikke inneholde flettefelt');
  // Turning the button off takes its problems with it.
  await page.getByRole('switch', { name: 'Knapp' }).click();
  await expect(field('Lenke')).toHaveCount(0);
  await expect(next).toBeEnabled();

  // The preview fills in merge fields with an example customer and shows the text as text.
  const preview = page.getByRole('complementary', { name: 'Forhåndsvisning' });
  await expect(preview.locator('iframe')).toHaveAttribute('srcdoc', /Åpent i romjulen/);
  await expect(preview.locator('iframe')).not.toHaveAttribute('srcdoc', /\{\{givenName\}\}/);
  await expect(preview).toContainText('Hei Ola');
  await expect(preview).not.toContainText('{{givenName}}');

  // Back on Mal, the template in use is marked; another one keeps what was written.
  await page.goBack();
  await expect(page.getByText('1 av 3', { exact: true })).toBeVisible();
  await expect(templates.locator('button[aria-current]')).toHaveAccessibleName(/^Kunngjøring/);
  await templates.getByRole('button', { name: /^Tilbud/ }).click();
  await expect(page.getByText('2 av 3', { exact: true })).toBeVisible();
  await expect(field('Overskrift')).toHaveValue('Åpent i romjulen');
  await expect(field('Melding')).toHaveValue('Hei {{givenName}}, vi har åpent i romjulen.');

  // Send needs a finished e-mail: an old link or a reload there goes back to Skriv.
  await field('Emne').fill('');
  await page.goto(`${baseURL}/company/marketing/email/create/send`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/email\/create\/write$/);
  await expect(bar).toContainText('Skriv inn et emne');
});

test('Ny e-post keeps the chosen recipients, asks before sending and keeps the e-mail when sending fails', async ({
  page,
  context,
  db,
}) => {
  await signIn(context);
  const customers = await addOptedInCustomers(db, 'EMAIL', 3);
  await page.goto(`${baseURL}/company/marketing/email/create`, { waitUntil: 'networkidle' });
  await page
    .getByRole('list', { name: 'Maler' })
    .getByRole('button', { name: /^Tilbud/ })
    .click();
  await page.getByLabel('Emne', { exact: true }).fill('Fredagstilbud');
  await page.getByLabel('Melding', { exact: true }).fill('20 % på klipp fredag.');
  await page.getByRole('button', { name: 'Velg mottakere' }).click();
  await expect(page).toHaveURL(/\/email\/create\/send$/);
  const recipients = page.getByRole('region', { name: 'Mottakere' });
  await expect(recipients).toContainText('Alle som har sagt ja3');

  // Leaving one customer out with the mouse counts at once.
  const leftOut = recipients.getByRole('list', { name: 'Ikke send til' }).getByRole('listitem');
  const search = recipients.getByRole('combobox', { name: 'Ikke send til' });
  await search.fill(customers[0].address);
  await recipients.getByRole('listbox', { name: 'Treff' }).getByRole('option').click();
  await expect(leftOut).toContainText(customers[0].address);
  const send = page.getByRole('button', { name: 'Send til 2 kunder' });
  await expect(send).toBeEnabled();

  // The choice is part of the saved e-mail.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(leftOut).toHaveCount(1);
  await expect(leftOut).toContainText(customers[0].address);
  await expect(send).toBeEnabled();

  // The confirmation starts on Tilbake, and Tilbake sends nothing.
  await send.click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('Send «Fredagstilbud» til 2 kunder?');
  await expect(confirm.getByRole('button', { name: 'Tilbake' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Tilbake' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(page).toHaveURL(/\/email\/create\/send$/);
  const campaigns = async () =>
    (
      await db.query<{ count: string }>(
        `select count(*) from marketing.marketing_campaigns where company_id = 1 and subject = 'Fredagstilbud'`,
      )
    ).rows[0].count;
  expect(await campaigns()).toBe('0');

  // "Endre" on the e-mail goes back to Skriv, and back from there goes on to Mal: the history never loops.
  await page.getByRole('button', { name: 'Endre e-posten' }).click();
  await expect(page).toHaveURL(/\/email\/create\/write$/);
  await page.goBack();
  await expect(page.getByText('1 av 3', { exact: true })).toBeVisible();
  await page.goForward();
  await page.getByRole('button', { name: 'Velg mottakere' }).click();
  await expect(page).toHaveURL(/\/email\/create\/send$/);

  // Everybody says no before it is sent: the backend refuses, the page says why and the e-mail stays.
  await db.query(`update marketing.marketing_consents set status = 'OPTED_OUT' where id = any($1::bigint[])`, [
    customers.map((customer) => customer.consentId),
  ]);
  await send.click();
  await confirm.getByRole('button', { name: 'Send nå' }).click();
  await expect(page.getByText('Kunne ikke sende e-posten')).toBeVisible();
  await expect(page.getByText('Ingen mottakere har gitt samtykke')).toBeVisible();
  await expect(page).toHaveURL(/\/email\/create\/send$/);
  expect(await campaigns()).toBe('0');
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.startsWith('pitell:marketing:email-draft:')),
    ),
  ).toHaveLength(1);

  // With nobody left who said yes, there is no list to tick in, and Send says so instead of asking to choose.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/email\/create\/send$/);
  await expect(recipients).toHaveCount(0);
  await expect(page.locator('[data-floating-action-bar]')).toContainText('Ingen har sagt ja til e-post ennå');
  await expect(page.getByRole('button', { name: 'Send til 0 kunder' })).toBeDisabled();
});

test('the overview leads to E-post and SMS, each with its own campaigns and recipients', async ({
  page,
  context,
  db,
}) => {
  await signIn(context);
  const [both] = await addOptedInCustomers(db, 'EMAIL', 2);
  await addOptedInCustomers(db, 'SMS', 1);
  // One customer said yes to both channels; an opt-out is nobody.
  await db.query(
    `insert into marketing.marketing_consents
       (company_id, channel, address, status, source, user_id, given_name, family_name, wording_version)
     select 1, 'SMS', '+4798765432', 'OPTED_IN', 'BOOKING_CHECKBOX', user_id, given_name, family_name, wording_version
     from marketing.marketing_consents where id = $1`,
    [both.consentId],
  );
  const [optedOut] = await addOptedInCustomers(db, 'EMAIL', 1);
  await db.query(`update marketing.marketing_consents set status = 'OPTED_OUT' where id = $1`, [optedOut.consentId]);
  await db.query(
    `insert into marketing.marketing_campaigns
       (company_id, name, channel, status, subject, body, completed_at, eligible_count, created_by_user_id)
     values (1, 'Julebooking', 'EMAIL', 'COMPLETED', 'Julebooking', '[{"type":"PARAGRAPH","text":"Hei"}]', now(), 2, 1)`,
  );

  await page.goto(`${baseURL}/company/marketing`, { waitUntil: 'networkidle' });
  const overview = page.getByRole('navigation', { name: 'Markedsføring' });
  await expect(overview.getByRole('link')).toHaveCount(2);
  await expect(overview.getByRole('link', { name: /^E-post/ })).toContainText('2mottakere');
  await expect(overview.getByRole('link', { name: /^SMS/ })).toContainText('2mottakere');
  // An Oversikt creates nothing.
  await expect(page.getByRole('link', { name: /^Ny (e-post|SMS)$/ })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/marketing-overview-desktop.png', fullPage: true });

  // E-post: its campaigns, Ny e-post, and Kampanjer | Mottakere.
  await overview.getByRole('link', { name: /^E-post/ }).click();
  await expect(page).toHaveURL(`${baseURL}/company/marketing/email`);
  const switchLinks = page.getByRole('navigation', { name: /Bytt mellom kampanjer og mottakere/ });
  await expect(switchLinks.getByRole('link', { name: 'Kampanjer' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('region', { name: 'Kampanjer' })).toContainText('Julebooking');
  await expect(page.getByRole('link', { name: 'Ny e-post' })).toBeVisible();
  await switchLinks.getByRole('link', { name: 'Mottakere' }).click();
  await expect(page).toHaveURL(`${baseURL}/company/marketing/email/recipients`);
  await expect(switchLinks.getByRole('link', { name: 'Mottakere' })).toHaveAttribute('aria-current', 'page');
  await expect(switchLinks.getByRole('link', { name: 'Kampanjer' })).not.toHaveAttribute('aria-current', 'page');
  const recipients = page.getByRole('region', { name: 'Mottakere' });
  await expect(recipients.getByRole('listitem')).toHaveCount(2);
  await expect(recipients).toContainText('@marketing.e2e.invalid');
  await expect(page.getByRole('link', { name: 'Ny e-post' })).toHaveCount(0);

  // SMS: no campaigns yet, its own two customers with their numbers, and Ny SMS.
  await page.goto(`${baseURL}/company/marketing/sms`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Ingen SMS-kampanjer ennå')).toBeVisible();
  await page.goto(`${baseURL}/company/marketing/sms/recipients`, { waitUntil: 'networkidle' });
  await expect(recipients.getByRole('listitem')).toHaveCount(2);
  await expect(recipients).toContainText('+47 987 65 432');
  await page.goto(`${baseURL}/company/marketing/sms`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Ny SMS' }).click();
  await expect(page).toHaveURL(`${baseURL}/company/marketing/sms/create`);
  await expect(page.getByLabel('Mottakere', { exact: true })).toContainText('2 mottakere');

  // Phone: ≡ on the overview and no create button; a channel page has ‹ and its create button above the menu.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/company/marketing`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Åpne meny' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Ny (e-post|SMS)$/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/marketing-overview-mobile.png', fullPage: true });
  await page.goto(`${baseURL}/company/marketing/email`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: 'Tilbake til Markedsføring' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ny e-post' })).toBeVisible();
  await page.screenshot({ path: 'test-results/marketing-campaigns-mobile.png', fullPage: true });
  await page.goto(`${baseURL}/company/marketing/sms/recipients`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('link', { name: 'Tilbake til Markedsføring' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ny SMS' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/marketing-recipients-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
});

test('the admin sends an SMS campaign', async ({ page, context, db }) => {
  await signIn(context);
  await addOptedInCustomers(db, 'SMS', 2);

  await page.goto(`${baseURL}/company/marketing/sms/create`);
  await page.getByLabel('Kampanjenavn').fill('Ledige timer fredag');
  await page.getByLabel('Melding').fill('Hei {{givenName}}! Vi har ledige timer fredag.');
  await expect(page.getByText('46 / 300')).toBeVisible();
  const estimate = page.getByRole('status', { name: 'SMS-estimat' });
  await expect(estimate).toContainText('1 SMS-enhet × 2 mottakere');
  await expect(estimate).toContainText(/Estimert pris: 2,40\s*kr eks\. mva\./);
  await page.getByLabel('Melding').fill('😀'.repeat(35));
  await expect(estimate).toContainText('2 SMS-enheter × 2 mottakere');
  await expect(estimate).toContainText('Emoji eller spesialtegn');
  await expect(estimate).toContainText(/Estimert pris: 4,80\s*kr eks\. mva\./);
  await page.getByLabel('Melding').fill('Hei {{givenName}}! Vi har ledige timer fredag.');
  await expect(page.getByRole('complementary', { name: 'Forhåndsvisning' })).toContainText(
    'Hei Ola! Vi har ledige timer fredag.',
  );

  await page.screenshot({ path: 'test-results/marketing-create-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Se over og send' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mobil bunnnavigasjon' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/marketing-create-mobile.png', fullPage: true });

  await page.getByRole('button', { name: 'Se over og send' }).click();
  await expect(page.getByRole('alertdialog')).toContainText(/Estimert pris: 2,40\s*kr eks\. mva\./);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page).toHaveURL(/\/company\/marketing\/\d+$/);
  const status = page.getByRole('region', { name: 'Status' });
  await expect(status).toContainText('SMS');
  await expect(status.getByText('Fullført', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('complementary', { name: 'Innhold' })).toContainText(
    'Hei {{givenName}}! Vi har ledige timer fredag.',
  );

  const stored = await db.query<{ channel: string; subject: string | null; body: string; sent: string }>(
    `
      select c.channel, c.subject, c.body,
             (select count(*) from marketing.marketing_messages m where m.campaign_id = c.id and m.status = 'SENT') as sent
      from marketing.marketing_campaigns c
      where c.company_id = 1 and c.name = 'Ledige timer fredag'
    `,
  );
  expect(stored.rows[0]).toMatchObject({
    channel: 'SMS',
    subject: null,
    body: 'Hei {{givenName}}! Vi har ledige timer fredag.',
    sent: '2',
  });
});

test('the admin cancels a campaign while it is sending', async ({ page, context, db, request }) => {
  await signIn(context);
  await addOptedInCustomers(db, 'EMAIL', 30);

  const created = await request.post(`${backendUrl}/marketing-service/company-user/marketing/email/campaigns`, {
    headers: authHeaders(accessToken),
    data: {
      subject: 'Høsttilbud',
      blocks: [{ type: 'PARAGRAPH', text: 'Hei {{givenName}}' }],
    },
  });
  await expect(created).toBeOK();
  const campaignId = (await created.json()).data.id as number;

  await page.goto(`${baseURL}/company/marketing/${campaignId}`);
  const status = page.getByRole('region', { name: 'Status' });
  await expect(status.getByText('Sender', { exact: true })).toBeVisible();
  await expect(status.getByRole('progressbar')).toBeVisible();

  let refreshes = 0;
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === `/company/marketing/${campaignId}.data`) {
      refreshes += 1;
    }
  });
  await expect.poll(() => refreshes, { timeout: 5000 }).toBeGreaterThanOrEqual(2);

  await status.getByRole('button', { name: 'Avbryt kampanje' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Avbryt kampanjen?');
  await expect(dialog).toContainText(/\d+ meldinger blir ikke sendt\./);
  await dialog.getByRole('button', { name: 'Avbryt kampanje' }).click();

  await expect(status.getByText('Avbrutt', { exact: true })).toBeVisible();
  await expect(status.getByRole('button', { name: 'Avbryt kampanje' })).toHaveCount(0);
  await expect(status).toContainText('Hoppet over');
  const refreshesAfterCancel = refreshes;
  // Observe two polling intervals to ensure terminal campaigns stop refreshing.
  await page.waitForTimeout(2200);
  expect(refreshes).toBe(refreshesAfterCancel);

  const stored = await db.query<{ status: string; cancelled_at: Date | null; skipped: string; queued: string }>(
    `
      select c.status, c.cancelled_at,
             count(*) filter (where m.status = 'SKIPPED' and m.skip_reason = 'CAMPAIGN_CANCELLED') as skipped,
             count(*) filter (where m.status = 'QUEUED') as queued
      from marketing.marketing_campaigns c
      join marketing.marketing_messages m on m.campaign_id = c.id
      where c.id = $1
      group by c.id
    `,
    [campaignId],
  );
  expect(stored.rows[0].status).toBe('CANCELLED');
  expect(stored.rows[0].cancelled_at).not.toBeNull();
  expect(Number(stored.rows[0].skipped)).toBeGreaterThan(0);
  expect(stored.rows[0].queued).toBe('0');

  const recipients = page.getByRole('region', { name: 'Mottakere' });
  await recipients.getByText('Mottakere (30)', { exact: true }).click();
  await expect(recipients.getByRole('listitem')).toHaveCount(25);
  await recipients.getByRole('link', { name: 'Neste side' }).click();
  await expect(recipients).toContainText('Side 2 av 2');
  await recipients.getByRole('link', { name: /^Hoppet over \(/ }).click();
  await expect(recipients.getByRole('link', { name: /^Hoppet over \(/ })).toHaveAttribute('aria-current', 'page');
  await expect(recipients).toContainText('Side 1 av');
  await expect(
    page.getByRole('region', { name: 'Mottakere' }).getByText('Kampanjen ble avbrutt').first(),
  ).toBeVisible();
});

test('a customer unsubscribes from the link without signing in', async ({ page, db }) => {
  const [customer] = await addOptedInCustomers(db, 'EMAIL', 1);
  const token = `e2e-${Date.now()}`;
  const messageId = await addSentMessage(db, customer, token);
  const consent = async () =>
    (
      await db.query<{ status: string; source: string }>(
        'select status, source from marketing.marketing_consents where id = $1',
        [customer.consentId],
      )
    ).rows[0];

  await page.goto(`${baseURL}/u/${token}`);
  await expect(page.getByRole('heading', { name: 'Vil du ikke lenger motta markedsføring på e-post?' })).toBeVisible();
  await expect(page.getByText('Fredrikstad Barbershop Bahar')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logg inn' })).toHaveCount(0);
  // Opening the link changes nothing (mail scanners open links too).
  expect(await consent()).toEqual({ status: 'OPTED_IN', source: 'BOOKING_CHECKBOX' });

  await page.getByRole('button', { name: 'Meld meg av' }).click();
  await expect(page.getByRole('heading', { name: 'Du er meldt av og vil ikke få flere meldinger.' })).toBeVisible();
  expect(await consent()).toEqual({ status: 'OPTED_OUT', source: 'UNSUBSCRIBE_LINK' });
  const message = await db.query<{ unsubscribed_at: Date | null }>(
    'select unsubscribed_at from marketing.marketing_messages where id = $1',
    [messageId],
  );
  expect(message.rows[0].unsubscribed_at).not.toBeNull();

  await page.goto(`${baseURL}/u/${token}`);
  await expect(page.getByRole('heading', { name: 'Du er meldt av.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Meld meg av' })).toHaveCount(0);

  const invalid = await page.goto(`${baseURL}/u/not-a-real-token`);
  expect(invalid?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Lenken er ugyldig eller utløpt.' })).toBeVisible();
});
