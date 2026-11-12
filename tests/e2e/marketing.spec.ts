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

test('the admin builds an email from blocks, sees the preview and sends it', async ({ page, context, db }) => {
  await signIn(context);
  await addOptedInCustomers(db, 'EMAIL', 2);
  await addOptedInCustomers(db, 'SMS', 1);

  await page.goto(`${baseURL}/company/marketing`, { waitUntil: 'networkidle' });
  await expect(page.getByText('Ingen kampanjer ennå')).toBeVisible();
  await page.getByRole('link', { name: 'Ny kampanje' }).click();
  await expect(page).toHaveURL(`${baseURL}/company/marketing/create`);

  await expect(page.getByRole('radio', { name: 'E-post', exact: true })).toBeChecked();
  await expect(page.getByLabel('Mottakere', { exact: true })).toContainText('2 mottakere');
  await page.getByRole('radio', { name: 'SMS', exact: true }).check();
  await expect(page.getByLabel('Mottakere', { exact: true })).toContainText('1 mottaker');
  await page.getByRole('radio', { name: 'E-post', exact: true }).check();

  await page.getByLabel('Kampanjenavn').fill('Julekampanje');
  await page.getByLabel('Emne').fill('God jul');
  await page.getByRole('textbox', { name: 'Avsnitt' }).fill('Hei ');
  await page.getByRole('button', { name: 'Sett inn kundedetaljer' }).click();
  await page.getByRole('menuitem', { name: 'Fornavn' }).click();
  await expect(page.getByRole('textbox', { name: 'Avsnitt' })).toHaveValue('Hei {{givenName}}');
  await page.getByRole('textbox', { name: 'Avsnitt' }).press('End');
  await page.getByRole('textbox', { name: 'Avsnitt' }).pressSequentially(', vi har åpent i romjulen.');
  await expect(page.getByRole('textbox', { name: 'Avsnitt' })).toHaveValue(
    'Hei {{givenName}}, vi har åpent i romjulen.',
  );

  // A heading, moved above the paragraph, and a button.
  await page.getByRole('button', { name: 'Legg til blokk' }).click();
  await page.getByRole('menuitem', { name: 'Overskrift' }).click();
  await page.getByRole('textbox', { name: 'Overskrift' }).fill('Julebooking er åpen');
  await page.getByRole('region', { name: 'Overskrift 2' }).getByRole('button', { name: 'Flytt opp' }).click();
  await page.getByRole('button', { name: 'Legg til blokk' }).click();
  await page.getByRole('menuitem', { name: 'Knapp' }).click();
  await page.getByLabel('Knappetekst').fill('Bestill time');
  await page.getByLabel('Lenke').fill('http://pitell.no');

  // The live preview comes from the backend, with the sample name filled in.
  const preview = page.locator('iframe[title="Forhåndsvisning"]');
  await expect(preview).toHaveAttribute('sandbox', '');
  await expect(preview).toHaveAttribute('srcdoc', /Julebooking er åpen[\s\S]*Hei Ola, vi har åpent i romjulen\./);

  // An http link is refused before anything is sent.
  await page.getByRole('button', { name: 'Se over og send' }).click();
  await expect(page.getByText('Lenken må starte med https://')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await page.getByLabel('Lenke').fill('https://pitell.no');
  await expect(preview).toHaveAttribute('srcdoc', /Bestill time/);
  await page.getByRole('button', { name: 'Se over og send' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Send til 2 kunder?');
  await dialog.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page).toHaveURL(/\/company\/marketing\/\d+$/);
  const status = page.getByRole('region', { name: 'Status' });
  await expect(status).toContainText('Julekampanje');
  // The page refreshes itself while sending; the dry run finishes two messages within seconds.
  await expect(status.getByText('Fullført', { exact: true })).toBeVisible({ timeout: 30_000 });
  const recipients = page.getByRole('region', { name: 'Mottakere' });
  await expect(recipients.getByRole('list')).not.toBeVisible();
  await recipients.getByText('Mottakere (2)', { exact: true }).click();
  await expect(recipients.getByRole('listitem')).toHaveCount(2);
  await expect(recipients.getByRole('link', { name: 'Sendt (2)', exact: true })).toBeVisible();
  await recipients.getByRole('link', { name: 'Sendt (2)', exact: true }).click();
  await expect(recipients.getByRole('listitem')).toHaveCount(2);
  await recipients.getByRole('link', { name: 'Alle (2)', exact: true }).click();
  await expect(recipients.getByRole('list')).toBeVisible();
  await recipients.getByText('Mottakere (2)', { exact: true }).click();
  await expect(recipients.getByRole('list')).not.toBeVisible();
  await page.screenshot({ path: 'test-results/marketing-detail-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/marketing-detail-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });

  // The backend got structured blocks, never HTML.
  const stored = await db.query<{ body: string; subject: string }>(
    `select body, subject from marketing.marketing_campaigns where company_id = 1 and name = 'Julekampanje'`,
  );
  expect(stored.rows[0].subject).toBe('God jul');
  expect(JSON.parse(stored.rows[0].body)).toEqual([
    expect.objectContaining({ type: 'HEADING', text: 'Julebooking er åpen' }),
    expect.objectContaining({ type: 'PARAGRAPH', text: 'Hei {{givenName}}, vi har åpent i romjulen.' }),
    expect.objectContaining({ type: 'BUTTON', text: 'Bestill time', url: 'https://pitell.no' }),
  ]);

  await page.getByRole('link', { name: 'Markedsføring' }).first().click();
  await expect(page.getByRole('region', { name: 'Kampanjer' })).toContainText('Julekampanje');
  await page.screenshot({ path: 'test-results/marketing-list-desktop.png', fullPage: true });
});

test('the admin sends an SMS campaign', async ({ page, context, db }) => {
  await signIn(context);
  await addOptedInCustomers(db, 'SMS', 2);

  await page.goto(`${baseURL}/company/marketing/create`);
  await page.getByLabel('Kampanjenavn').fill('Ledige timer fredag');
  await page.getByRole('radio', { name: 'SMS', exact: true }).check();
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

  const created = await request.post(`${backendUrl}/marketing-service/company-user/marketing/campaigns`, {
    headers: authHeaders(accessToken),
    data: {
      name: 'Høsttilbud',
      channel: 'EMAIL',
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
  await expect(recipients.getByRole('listitem')).toHaveCount(10);
  await recipients.getByRole('link', { name: 'Neste side' }).click();
  await expect(recipients).toContainText('Side 2 av 3');
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
