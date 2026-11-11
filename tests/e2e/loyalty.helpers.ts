import { expect, type APIRequestContext } from '@playwright/test';
import type { Pool } from 'pg';
import { accessTokenCookie } from '../../app/routes/auth/_features/auth.cookies.server';
import { backendUrl } from '../../scripts/e2e/stack';

/** Customers made by the loyalty specs use this domain, so cleanup never touches other suites' data. */
const CUSTOMER_DOMAIN = '@loyalty.e2e.invalid';
const DAY = 24 * 60 * 60 * 1000;

export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

/** Signs in as the seeded admin of company 1 and returns the company-scoped access token. */
export async function signInAsCompanyAdmin(request: APIRequestContext): Promise<string> {
  const signIn = await request.post(`${backendUrl}/base-service/auth/sign-in`, {
    data: {
      provider: 'LOCAL',
      emailOrMobile: process.env.E2E_COMPANY_USER_EMAIL,
      password: process.env.E2E_COMPANY_USER_PASSWORD,
    },
  });
  await expect(signIn, 'The configured E2E user must be able to sign in.').toBeOK();
  const baseToken = (await signIn.json()).data.authTokens.accessToken as string;

  const companySignIn = await request.post(`${backendUrl}/base-service/auth/company-sign-in`, {
    headers: { Authorization: `Bearer ${baseToken}` },
    data: { companyId: Number(process.env.E2E_COMPANY_ID) || 1 },
  });
  await expect(companySignIn).toBeOK();
  return (await companySignIn.json()).data.accessToken as string;
}

/** The value of the portal's access_token cookie for a company-scoped token. */
export async function portalCookieValue(accessToken: string): Promise<string> {
  return (await accessTokenCookie.serialize(accessToken)).split(';')[0].slice('access_token='.length);
}

export const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

let customerCounter = 0;

/** A new customer with a unique family name, so a search finds only their appointments. */
export async function createCustomer(db: Pool) {
  customerCounter += 1;
  const familyName = `Lojal${Date.now()}x${customerCounter}`;
  const email = `${familyName.toLowerCase()}${CUSTOMER_DOMAIN}`;
  const result = await db.query<{ id: string }>(
    `
      insert into base.users (given_name, family_name, email, provider, email_verified_at)
      values ('Treue', $1::text, $2::text, 'LOCAL', now())
      returning id
    `,
    [familyName, email],
  );
  return { id: Number(result.rows[0].id), givenName: 'Treue', familyName };
}

/** One 20-minute appointment with the seeded provider (profile 1) for the customer. */
export async function addVisit(
  db: Pool,
  customerId: number,
  start: Date,
  options: { noShow?: boolean; cancelled?: boolean } = {},
) {
  const appointment = await db.query<{ id: string }>(
    `
      insert into booking.appointments (profile_id, user_id, start_time, end_time, no_show, cancelled_at)
      values (1, $1, $2::timestamptz, $2::timestamptz + interval '20 minutes', $3, case when $4 then now() end)
      returning id
    `,
    [customerId, start.toISOString(), options.noShow ?? false, options.cancelled ?? false],
  );
  const id = Number(appointment.rows[0].id);
  // Service 1 (Hårklipp) comes from seedBookingFixture.
  await db.query(`insert into booking.appointment_services (appointment_id, service_id) values ($1, 1)`, [id]);
  return id;
}

/** Writes the company 1 rule straight to the database. `activeSinceDaysAgo` null leaves it unset. */
export async function setRule(
  db: Pool,
  { visitsRequired, enabled = true, activeSinceDaysAgo = 60 }: { visitsRequired: number; enabled?: boolean; activeSinceDaysAgo?: number | null },
) {
  await db.query('delete from booking.loyalty_rules where company_id = 1');
  await db.query(
    `
      insert into booking.loyalty_rules (company_id, visits_required, enabled, active_since)
      values (1, $1, $2, case when $3::int is null then null else now() - make_interval(days => $3::int) end)
    `,
    [visitsRequired, enabled, activeSinceDaysAgo],
  );
}

/** Removes the rule and every appointment made by the loyalty specs' customers. */
export async function cleanLoyaltyData(db: Pool) {
  await db.query('delete from booking.loyalty_rules where company_id = 1');
  await db.query(
    `
      delete from booking.appointment_services
      where appointment_id in (
        select a.id from booking.appointments a join base.users u on u.id = a.user_id where u.email like $1
      )
    `,
    [`%${CUSTOMER_DOMAIN}`],
  );
  await db.query(
    `delete from booking.appointments where user_id in (select id from base.users where email like $1)`,
    [`%${CUSTOMER_DOMAIN}`],
  );
}
