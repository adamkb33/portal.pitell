import type { Pool } from 'pg';
import { selectBookingDetails, selectServicesAndTime, submitContactForm } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

async function counts(db: Pool) {
  const result = await db.query<{ users: string; challenges: string }>(`
    select
      (select count(*) from base.users)::text as users,
      (select count(*) from base.booking_otp_challenges)::text as challenges
  `);
  return result.rows[0];
}

test('an expired booking session restarts automatically and the new session works', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await expect(page).toHaveURL(/\/session\/contact(?:[?]|$)/);
  const before = await counts(db);

  // The customer left the tab open until the session ran out.
  await db.query("update booking.appointment_sessions set expires_at = now() - interval '1 minute'");

  await submitContactForm(page, { givenName: 'Late', familyName: 'Customer', mobileNumber: '90000031' });

  // No "start på nytt" click: the customer lands at the first step of a fresh session.
  await expect(page).toHaveURL(/\/select-services/);
  expect(await counts(db)).toEqual(before);

  const sessions = await db.query<{ active: string; fresh_and_empty: string }>(`
    select
      count(*) filter (where expires_at > now())::text as active,
      count(*) filter (where expires_at > now() and selected_start_time is null and user_id is null)::text
        as fresh_and_empty
    from booking.appointment_sessions
  `);
  expect(sessions.rows[0]).toEqual({ active: '1', fresh_and_empty: '1' });

  // The new session is usable: the customer can pick services and a time again.
  await selectServicesAndTime(page, ['Hårklipp']);
  await expect(page).toHaveURL(/\/session\/contact(?:[?]|$)/);
});
