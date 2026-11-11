import { createHash } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import type { Pool } from 'pg';
import { backendUrl } from '../../scripts/e2e/stack';
import { authHeaders } from './loyalty.helpers';

/** Customers made by the marketing specs use this domain, so cleanup never touches other suites' data. */
const CUSTOMER_DOMAIN = '@marketing.e2e.invalid';
const SYSTEM_ADMIN_EMAIL = 'system-admin@marketing-admin.e2e.invalid';

let customerCounter = 0;

/**
 * A system administrator, who grants and removes products the way production does. The backend caches each user's
 * permissions and only the system-admin product endpoints clear that cache, so changing company_products with SQL
 * would leave the company admin without marketing after other suites have loaded their permissions.
 * "password" is the backend's legacy default, which it accepts and re-hashes on first sign-in.
 */
export async function signInAsSystemAdmin(request: APIRequestContext, db: Pool): Promise<string> {
  await db.query(
    `
      with admin as (
        insert into base.users (given_name, family_name, email, password, provider, email_verified_at)
        values ('E2E', 'Systemadmin', $1::text, 'password', 'LOCAL', now())
        on conflict (provider, email) do update set email = excluded.email
        returning id
      ),
      mobile as (
        insert into base.user_mobile_number (user_id, mobile_number, verification_status, verified_at)
        select id, '+4799990099', 'VERIFIED', now() from admin
        on conflict (user_id) do nothing
      )
      insert into base.user_roles (user_id, role_name, created_at, updated_at)
      select id, 'SYSTEM_ADMIN', now(), now() from admin
      where not exists (
        select 1 from base.user_roles r where r.user_id = (select id from admin) and r.role_name = 'SYSTEM_ADMIN'
      )
    `,
    [SYSTEM_ADMIN_EMAIL],
  );

  const signIn = await request.post(`${backendUrl}/base-service/auth/sign-in`, {
    data: { provider: 'LOCAL', emailOrMobile: SYSTEM_ADMIN_EMAIL, password: 'password' },
  });
  await expect(signIn, 'The marketing system admin must be able to sign in.').toBeOK();
  return (await signIn.json()).data.authTokens.accessToken as string;
}

/** Company 1 has MARKETING only while these specs run; the booking suite expects no marketing checkboxes. */
export async function setMarketingProduct(request: APIRequestContext, systemAdminToken: string, enabled: boolean) {
  const body = { headers: authHeaders(systemAdminToken), data: { companyId: 1, products: ['MARKETING'] } };
  const response = enabled
    ? await request.post(`${backendUrl}/base-service/system-admin/companies/add-products`, body)
    : await request.delete(`${backendUrl}/base-service/system-admin/companies/products`, body);
  await expect(response, `MARKETING must be ${enabled ? 'granted' : 'removed'} through the system admin API.`).toBeOK();
}

export async function cleanMarketingData(db: Pool) {
  await db.query('delete from marketing.marketing_messages where company_id = 1');
  await db.query('delete from marketing.marketing_campaigns where company_id = 1');
  await db.query('delete from marketing.marketing_consents where company_id = 1');
  await db.query(
    `delete from base.user_mobile_number where user_id in (select id from base.users where email like $1)`,
    [`%${CUSTOMER_DOMAIN}`],
  );
  await db.query('delete from base.users where email like $1', [`%${CUSTOMER_DOMAIN}`]);
}

export type MarketingCustomer = { userId: number; consentId: number; address: string; givenName: string };

/**
 * Customers who ticked marketing on the given channel while booking, as the booking flow records it: a real user and
 * one OPTED_IN consent per customer.
 */
export async function addOptedInCustomers(db: Pool, channel: 'EMAIL' | 'SMS', count: number) {
  const customers: MarketingCustomer[] = [];
  for (let index = 0; index < count; index += 1) {
    customerCounter += 1;
    const tag = `${Date.now()}${customerCounter}`;
    const email = `kunde${tag}${CUSTOMER_DOMAIN}`;
    const mobile = `+4799${String(customerCounter).padStart(6, '0')}`;
    const user = await db.query<{ id: string }>(
      `
        insert into base.users (given_name, family_name, email, provider, email_verified_at)
        values ('Kari', $1::text, $2::text, 'LOCAL', now())
        returning id
      `,
      [`Kunde${tag}`, email],
    );
    const userId = Number(user.rows[0].id);
    const address = channel === 'EMAIL' ? email : mobile;
    const consent = await db.query<{ id: string }>(
      `
        insert into marketing.marketing_consents
          (company_id, channel, address, status, source, user_id, given_name, family_name, wording_version)
        values (1, $1, $2, 'OPTED_IN', 'BOOKING_CHECKBOX', $3, 'Kari', $4, 'booking-marketing-v1')
        returning id
      `,
      [channel, address, userId, `Kunde${tag}`],
    );
    customers.push({ userId, consentId: Number(consent.rows[0].id), address, givenName: 'Kari' });
  }
  return customers;
}

/**
 * A finished email campaign with one sent message whose unsubscribe link uses `rawToken`, the way the worker stores
 * it (only the SHA-256 hash of the token is kept).
 */
export async function addSentMessage(db: Pool, customer: MarketingCustomer, rawToken: string) {
  const campaign = await db.query<{ id: string }>(
    `
      insert into marketing.marketing_campaigns
        (company_id, name, channel, status, subject, body, completed_at, eligible_count, created_by_user_id)
      values (1, 'Høsttilbud', 'EMAIL', 'COMPLETED', 'Høsttilbud',
              '[{"type":"PARAGRAPH","text":"Hei {{givenName}}"}]', now(), 1, 1)
      returning id
    `,
  );
  const message = await db.query<{ id: string }>(
    `
      insert into marketing.marketing_messages
        (campaign_id, company_id, consent_id, channel, recipient_address, recipient_given_name, status,
         provider_message_id, sent_at, unsubscribe_token_hash)
      values ($1, 1, $2, 'EMAIL', $3, $4, 'SENT', 'dry-run', now(), $5)
      returning id
    `,
    [campaign.rows[0].id, customer.consentId, customer.address, customer.givenName, sha256(rawToken)],
  );
  return Number(message.rows[0].id);
}

export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
