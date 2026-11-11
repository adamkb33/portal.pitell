import { createHmac } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';
import type { Pool } from 'pg';
import { mobileVerificationTokenCookie } from '../../app/routes/booking/public/appointment/session/contact/_utils/mobile-verification-token.cookie.server';

export async function seedRememberTokenCustomer(db: Pool) {
  const contact = {
    givenName: 'Returning',
    familyName: 'Customer',
    mobileNumber: '92000031',
  };
  const mobileNumber = `+47${contact.mobileNumber}`;
  const user = await db.query<{ id: string }>(
    `
      insert into base.users (given_name, family_name, email, provider, email_verified_at)
      values ($1, $2, 'remember.customer@booking.e2e.invalid', 'LOCAL', now())
      on conflict (provider, email) do update
      set given_name = excluded.given_name, family_name = excluded.family_name, deleted_at = null
      returning id::text
    `,
    [contact.givenName, contact.familyName],
  );
  const userId = user.rows[0].id;
  await db.query(
    `
      insert into base.user_mobile_number (user_id, mobile_number, verification_status, verified_at)
      values ($1, $2, 'VERIFIED', now())
      on conflict (user_id) do update
      set mobile_number = excluded.mobile_number, verification_status = 'VERIFIED', verified_at = now(), deleted_at = null
    `,
    [userId, mobileNumber],
  );
  return { userId, mobileNumber, contact };
}

export function mintMobileVerificationToken(
  mobileNumber: string,
  expiresEpochSeconds: number,
  purpose = 'MOBILE_VERIFICATION',
) {
  const payload = `${mobileNumber}:${expiresEpochSeconds}:${purpose}`;
  const signature = createHmac('sha256', 'default-dev-secret').update(payload).digest('base64url');
  return `${payload}:${signature}`;
}

export async function setMobileVerificationCookie(context: BrowserContext, url: string, token: string) {
  const serialized = await mobileVerificationTokenCookie.serialize(token);
  const cookiePair = serialized.split(';')[0];
  await context.addCookies([
    {
      name: 'mobile_verification_token',
      value: cookiePair.slice(cookiePair.indexOf('=') + 1),
      url,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/** Builds a cancel-link token in the backend's format: header.payload.HMAC-SHA256 signature (base64url). */
export function mintCancelAppointmentToken(
  appointmentId: number,
  expiresEpochSeconds: number,
  secret = 'default-dev-secret',
) {
  const b64 = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
  const header = b64('{"alg":"HS256","typ":"JWT"}');
  const payload = b64(JSON.stringify({ appointmentId, expiresAt: expiresEpochSeconds }));
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
