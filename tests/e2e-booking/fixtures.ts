import { expect, test as base } from '@playwright/test';
import { Pool } from 'pg';
import { readDatabaseUrl } from '../../scripts/e2e/stack';

export const test = base.extend<{}, { db: Pool }>({
  db: [
    async ({}, use) => {
      const pool = new Pool({
        connectionString: readDatabaseUrl(),
        max: 4,
        application_name: 'portal-playwright-booking',
      });
      await pool.query('select 1');

      try {
        await use(pool);
      } finally {
        await pool.end();
      }
    },
    { scope: 'worker' },
  ],
});

export { expect };

export async function resetMutableBookingState(db: Pool) {
  await db.query(`
    truncate table
      notification.notification_deliveries,
      notification.in_app_notifications,
      base.booking_otp_challenges,
      booking.appointment_services,
      booking.appointment_session_services,
      booking.appointments,
      booking.appointment_sessions
    restart identity cascade
  `);
}

const DEMO_CUSTOMERS = [
  { givenName: 'Ada', familyName: 'Lovelace', email: 'ada.lovelace@company.e2e.invalid', mobile: '+4798880001' },
  { givenName: 'Grace', familyName: 'Hopper', email: 'grace.hopper@company.e2e.invalid', mobile: '+4798880002' },
  { givenName: 'Alan', familyName: 'Turing', email: 'alan.turing@company.e2e.invalid', mobile: '+4798880003' },
];
const DEMO_APPOINTMENT_COUNT = 6;

/**
 * Gives company 1 three customers and six past appointments, which the company specs (tests/e2e) need for the
 * appointment list, search and "create appointment" flows. The booking suite wipes appointments between its tests,
 * so every spec file that needs them calls this first; it only inserts what is missing and is safe to repeat.
 */
export async function seedAppointmentHistory(db: Pool) {
  // The mobile bottom navigation of the company specs expects Oversikt, Booking and Timelister.
  await db.query(`
    insert into base.company_products (company_id, product)
    select 1, 'TIMESHEET'
    where not exists (select 1 from base.company_products where company_id = 1 and product = 'TIMESHEET')
  `);

  for (const customer of DEMO_CUSTOMERS) {
    await db.query(
      `
        insert into base.users (given_name, family_name, email, provider, email_verified_at)
        select $1::text, $2::text, $3::text, 'LOCAL', now()
        where not exists (select 1 from base.users where provider = 'LOCAL' and email = $3::text)
      `,
      [customer.givenName, customer.familyName, customer.email],
    );
    await db.query(
      `
        insert into base.user_mobile_number (user_id, mobile_number, verification_status, verified_at)
        select u.id, $2::text, 'VERIFIED', now()
        from base.users u
        where u.email = $1::text
          and not exists (select 1 from base.user_mobile_number m where m.user_id = u.id)
      `,
      [customer.email, customer.mobile],
    );
  }

  const existing = await db.query<{ count: number }>(`
    select count(*)::int as count
    from booking.appointments a
    join base.users u on u.id = a.user_id
    where a.profile_id = 1 and a.deleted_at is null
      and a.start_time < now() and u.email like '%@company.e2e.invalid'
  `);
  const missing = DEMO_APPOINTMENT_COUNT - existing.rows[0].count;

  const hour = 60 * 60 * 1000;
  const lastWholeHour = Math.floor(Date.now() / hour) * hour;
  for (let i = 0; i < missing; i++) {
    // One a day going back from yesterday, so they all list as past appointments and never overlap.
    const start = new Date(lastWholeHour - (i + 1) * 24 * hour);
    const customer = DEMO_CUSTOMERS[i % DEMO_CUSTOMERS.length];
    const appointment = await db.query<{ id: string }>(
      `
        insert into booking.appointments (profile_id, user_id, start_time, end_time)
        select 1, u.id, $2::timestamptz, $2::timestamptz + interval '20 minutes'
        from base.users u where u.email = $1::text
        returning id
      `,
      [customer.email, start.toISOString()],
    );
    // Service ids 1-4 come from seedBookingFixture.
    await db.query(`insert into booking.appointment_services (appointment_id, service_id) values ($1, $2)`, [
      appointment.rows[0].id,
      (i % 4) + 1,
    ]);
  }
}

export async function seedBookingFixture(db: Pool) {
  await db.query(`
    begin;

    -- User 1 doubles as the signed-in company admin of the company/auth-refresh suites: they sign in with
    -- e2eAdmin's password, which needs a verified mobile number for sign-in to finish.
    insert into base.users (id, given_name, family_name, email, password, provider, email_verified_at)
    values (1, 'E2E', 'Behandler', 'provider@booking.e2e.invalid', 'password', 'LOCAL', now());

    insert into base.user_mobile_number (user_id, mobile_number, verification_status, verified_at)
    values (1, '+4799990001', 'VERIFIED', now());

    insert into base.companies (id, org_num, name)
    values (1, '927491745', 'Fredrikstad Barbershop Bahar');

    insert into base.company_profiles (id, company_id, display_name)
    values (1, 1, 'Fredrikstad Barbershop Bahar');

    insert into base.company_products (id, company_id, product)
    values (1, 1, 'BOOKING');

    insert into base.company_roles (id, company_id, user_id, role_name)
    values (1, 1, 1, 'ADMIN');

    insert into booking.service_groups (id, company_id, name)
    values
      (1, 1, 'Klipp'),
      (2, 1, 'Styling'),
      (3, 1, 'Skjegg');

    insert into booking.services (id, company_id, service_group_id, name, price, duration)
    values
      (1, 1, 1, 'Hårklipp', 450, 20),
      (2, 1, 2, 'Vask og styling', 350, 20),
      (3, 1, 3, 'Skjeggtrim', 300, 20),
      (4, 1, 1, 'Maskinklipp', 250, 20);

    insert into booking.booking_profiles (id, user_id, company_id, description, created_at, updated_at)
    values (1, 1, 1, 'E2E booking provider', now(), now());

    insert into booking.booking_profile_services (id, profile_id, service_id, created_at, updated_at)
    values
      (1, 1, 1, now(), now()),
      (2, 1, 2, now(), now()),
      (3, 1, 3, now(), now()),
      (4, 1, 4, now(), now());

    insert into booking.daily_schedules (id, profile_id, day_of_week, start_time, end_time)
    values
      (1, 1, 'MONDAY', '08:00', '18:00'),
      (2, 1, 'TUESDAY', '08:00', '18:00'),
      (3, 1, 'WEDNESDAY', '08:00', '18:00'),
      (4, 1, 'THURSDAY', '08:00', '18:00'),
      (5, 1, 'FRIDAY', '08:00', '18:00'),
      (6, 1, 'SATURDAY', '08:00', '16:00');

    select setval(pg_get_serial_sequence('base.users', 'id'), 1, true);
    select setval(pg_get_serial_sequence('base.companies', 'id'), 1, true);
    select setval(pg_get_serial_sequence('base.company_profiles', 'id'), 1, true);
    select setval(pg_get_serial_sequence('base.company_products', 'id'), 1, true);
    select setval(pg_get_serial_sequence('base.company_roles', 'id'), 1, true);
    select setval(pg_get_serial_sequence('booking.service_groups', 'id'), 3, true);
    select setval(pg_get_serial_sequence('booking.services', 'id'), 4, true);
    select setval(pg_get_serial_sequence('booking.booking_profiles', 'id'), 1, true);
    select setval(pg_get_serial_sequence('booking.booking_profile_services', 'id'), 4, true);
    select setval(pg_get_serial_sequence('booking.daily_schedules', 'id'), 6, true);

    -- Company 2 has two providers, so it shows the employee step instead of auto-selecting.
    insert into base.users (id, given_name, family_name, email, provider, email_verified_at)
    values
      (2, 'Anna', 'Klipper', 'anna@booking.e2e.invalid', 'LOCAL', now()),
      (3, 'Bjørn', 'Barberer', 'bjorn@booking.e2e.invalid', 'LOCAL', now());

    insert into base.companies (id, org_num, name)
    values (2, '927491746', 'Nordre Frisør');

    insert into base.company_profiles (id, company_id, display_name)
    values (2, 2, 'Nordre Frisør');

    insert into base.company_products (id, company_id, product)
    values (2, 2, 'BOOKING');

    insert into base.company_roles (id, company_id, user_id, role_name)
    values (2, 2, 2, 'ADMIN'), (3, 2, 3, 'ADMIN');

    insert into booking.service_groups (id, company_id, name)
    values (4, 2, 'Klipp');

    insert into booking.services (id, company_id, service_group_id, name, price, duration)
    values (5, 2, 4, 'Herreklipp', 400, 20);

    insert into booking.booking_profiles (id, user_id, company_id, description, created_at, updated_at)
    values (2, 2, 2, 'Anna', now(), now()), (3, 3, 2, 'Bjørn', now(), now());

    insert into booking.booking_profile_services (id, profile_id, service_id, created_at, updated_at)
    values (5, 2, 5, now(), now()), (6, 3, 5, now(), now());

    -- Both providers keep the same opening hours as company 1.
    insert into booking.daily_schedules (profile_id, day_of_week, start_time, end_time)
    select new_profile.id, template.day_of_week, template.start_time, template.end_time
    from booking.daily_schedules template
    cross join (values (2), (3)) as new_profile(id)
    where template.profile_id = 1;

    select setval(pg_get_serial_sequence('base.users', 'id'), 3, true);
    select setval(pg_get_serial_sequence('base.companies', 'id'), 2, true);
    select setval(pg_get_serial_sequence('base.company_profiles', 'id'), 2, true);
    select setval(pg_get_serial_sequence('base.company_products', 'id'), 2, true);
    select setval(pg_get_serial_sequence('base.company_roles', 'id'), 3, true);
    select setval(pg_get_serial_sequence('booking.service_groups', 'id'), 4, true);
    select setval(pg_get_serial_sequence('booking.services', 'id'), 5, true);
    select setval(pg_get_serial_sequence('booking.booking_profiles', 'id'), 3, true);
    select setval(pg_get_serial_sequence('booking.booking_profile_services', 'id'), 6, true);

    commit;
  `);
}
