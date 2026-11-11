import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '../e2e-booking/fixtures';
import { backendUrl } from '../../scripts/e2e/stack';
import { addVisit, authHeaders, cleanLoyaltyData, createCustomer, daysFromNow, setRule, signInAsCompanyAdmin } from './loyalty.helpers';

type StaffAppointment = { id: number; loyaltyFreeVisit: boolean; noShow: boolean };

const bookingApi = `${backendUrl}/booking-service/company-user`;

/** The customer's appointments as staff see them, oldest first. */
async function appointmentsOf(request: APIRequestContext, token: string, familyName: string) {
  const response = await request.get(`${bookingApi}/appointments`, {
    headers: authHeaders(token),
    params: { search: familyName, size: '50', direction: 'ASC' },
  });
  await expect(response).toBeOK();
  return (await response.json()).data.content as StaffAppointment[];
}

const freeIds = (appointments: StaffAppointment[]) => appointments.filter((a) => a.loyaltyFreeVisit).map((a) => a.id);

function setNoShow(request: APIRequestContext, token: string, appointmentId: number, noShow: boolean) {
  return request.patch(`${bookingApi}/appointments/${appointmentId}/no-show`, {
    headers: authHeaders(token),
    data: { noShow },
  });
}

test.describe('loyalty program: which visits are free', () => {
  test.beforeEach(async ({ db }) => {
    await cleanLoyaltyData(db);
  });

  test.afterAll(async ({ db }) => {
    await cleanLoyaltyData(db);
  });

  test('every 3rd visit is free, then the card starts over', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    await setRule(db, { visitsRequired: 3 });
    const customer = await createCustomer(db);
    const ids = [];
    for (const day of [-7, -6, -5, -4, -3, -2, -1]) ids.push(await addVisit(db, customer.id, daysFromNow(day)));

    const appointments = await appointmentsOf(request, token, customer.familyName);

    expect(appointments.map((a) => a.id)).toEqual(ids);
    expect(freeIds(appointments)).toEqual([ids[2], ids[5]]);
  });

  test('nothing is free while the program is off', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    await setRule(db, { visitsRequired: 1, enabled: false });
    const customer = await createCustomer(db);
    await addVisit(db, customer.id, daysFromNow(-2));
    await addVisit(db, customer.id, daysFromNow(-1));

    expect(freeIds(await appointmentsOf(request, token, customer.familyName))).toEqual([]);
  });

  test('visits before the program was activated do not count', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    await setRule(db, { visitsRequired: 2, activeSinceDaysAgo: 5 });
    const customer = await createCustomer(db);
    await addVisit(db, customer.id, daysFromNow(-10));
    await addVisit(db, customer.id, daysFromNow(-9));
    await addVisit(db, customer.id, daysFromNow(-3));
    const second = await addVisit(db, customer.id, daysFromNow(-2));

    // Only the last two visits count, so the second of them is the 2nd visit.
    expect(freeIds(await appointmentsOf(request, token, customer.familyName))).toEqual([second]);
  });

  test('cancelled and no-show visits do not count, so the free visit moves up', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    await setRule(db, { visitsRequired: 2 });
    const customer = await createCustomer(db);
    await addVisit(db, customer.id, daysFromNow(-4));
    await addVisit(db, customer.id, daysFromNow(-3), { noShow: true });
    await addVisit(db, customer.id, daysFromNow(-2), { cancelled: true });
    const last = await addVisit(db, customer.id, daysFromNow(-1));

    const appointments = await appointmentsOf(request, token, customer.familyName);

    // Counting visits are the 1st and the last one. The last one is the 2nd, so it is free.
    expect(freeIds(appointments)).toEqual([last]);
  });

  test('a visit is only free for the customer who made it', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    await setRule(db, { visitsRequired: 2 });
    const first = await createCustomer(db);
    const second = await createCustomer(db);
    await addVisit(db, first.id, daysFromNow(-2));
    await addVisit(db, second.id, daysFromNow(-1));

    expect(freeIds(await appointmentsOf(request, token, first.familyName))).toEqual([]);
    expect(freeIds(await appointmentsOf(request, token, second.familyName))).toEqual([]);
  });
});

test.describe('loyalty program: saving the rule', () => {
  test.beforeEach(async ({ db }) => {
    await cleanLoyaltyData(db);
  });

  test.afterAll(async ({ db }) => {
    await cleanLoyaltyData(db);
  });

  test('the activation date is set when the program is switched on, and only then', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    const save = (enabled: boolean) =>
      request.put(`${bookingApi}/loyalty-rule`, { headers: authHeaders(token), data: { visitsRequired: 4, enabled } });
    const activeSince = async () =>
      (await db.query<{ active_since: Date | null }>('select active_since from booking.loyalty_rules where company_id = 1'))
        .rows[0].active_since;

    await expect(await save(false)).toBeOK();
    expect(await activeSince()).toBeNull();

    await expect(await save(true)).toBeOK();
    const activated = await activeSince();
    expect(activated).not.toBeNull();

    // Saving again while it is on keeps the original date.
    await expect(await save(true)).toBeOK();
    expect((await activeSince())?.getTime()).toBe(activated!.getTime());

    const saved = await request.get(`${bookingApi}/loyalty-rule`, { headers: authHeaders(token) });
    expect((await saved.json()).data).toMatchObject({ visitsRequired: 4, enabled: true });
  });

  test('a rule below 1 is refused', async ({ request }) => {
    const token = await signInAsCompanyAdmin(request);

    const response = await request.put(`${bookingApi}/loyalty-rule`, {
      headers: authHeaders(token),
      data: { visitsRequired: 0, enabled: true },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('marking a visit as "ikke møtt"', () => {
  test.beforeEach(async ({ db }) => {
    await cleanLoyaltyData(db);
  });

  test.afterAll(async ({ db }) => {
    await cleanLoyaltyData(db);
  });

  test('moves the free marker to the next visit, and undoing it moves it back', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    await setRule(db, { visitsRequired: 2 });
    const customer = await createCustomer(db);
    await addVisit(db, customer.id, daysFromNow(-3));
    const second = await addVisit(db, customer.id, daysFromNow(-2));
    const third = await addVisit(db, customer.id, daysFromNow(-1));
    expect(freeIds(await appointmentsOf(request, token, customer.familyName))).toEqual([second]);

    await expect(await setNoShow(request, token, second, true)).toBeOK();
    const afterMarking = await appointmentsOf(request, token, customer.familyName);
    expect(afterMarking.find((a) => a.id === second)?.noShow).toBe(true);
    expect(freeIds(afterMarking)).toEqual([third]);

    await expect(await setNoShow(request, token, second, false)).toBeOK();
    expect(freeIds(await appointmentsOf(request, token, customer.familyName))).toEqual([second]);
  });

  test('an appointment that has not started cannot be marked', async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    const customer = await createCustomer(db);
    const upcoming = await addVisit(db, customer.id, daysFromNow(1));

    const response = await setNoShow(request, token, upcoming, true);

    expect(response.status()).toBe(400);
    expect((await response.json()).message.id).toBe('APPOINTMENT_NOT_STARTED');
  });

  test("another company's appointment gets the same answer as an unknown one", async ({ request, db }) => {
    const token = await signInAsCompanyAdmin(request);
    const customer = await createCustomer(db);
    // Profile 2 belongs to company 2 in the booking fixture.
    const foreign = await db.query<{ id: string }>(
      `
        insert into booking.appointments (profile_id, user_id, start_time, end_time)
        values (2, $1, now() - interval '2 days', now() - interval '2 days' + interval '20 minutes')
        returning id
      `,
      [customer.id],
    );
    const foreignId = Number(foreign.rows[0].id);

    for (const id of [foreignId, 999_999]) {
      const response = await setNoShow(request, token, id, true);
      expect(response.status()).toBe(404);
      expect((await response.json()).message.id).toBe('APPOINTMENT_NOT_FOUND');
    }
    const stored = await db.query<{ no_show: boolean }>('select no_show from booking.appointments where id = $1', [foreignId]);
    expect(stored.rows[0].no_show).toBe(false);
  });
});
