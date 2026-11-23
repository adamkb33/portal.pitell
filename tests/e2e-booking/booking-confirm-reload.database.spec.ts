import { acceptTerms, completeGuestContact, selectBookingDetails } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

// React Router reloads the current page when the next page's code fails to load. Right after "Bekreft" that page is
// the overview, whose booking session is already used. The customer must land on the confirmation, not be sent back
// to pick a service, where a real customer booked the same haircut a second time.
test('a reload right after confirming shows the confirmation, not the service list', async ({ page, db }) => {
  await selectBookingDetails(page, ['Hårklipp']);
  await completeGuestContact(page, { givenName: 'Reload', familyName: 'Etter', mobileNumber: '90000077' });
  await acceptTerms(page);

  // Fail the confirmation page's code once, like a dropped request on a phone.
  let blocked = false;
  await page.route('**/booking.public.appointment.success.route.tsx*', async (route) => {
    if (blocked) return route.continue();
    blocked = true;
    await route.abort('failed');
  });
  const overviewReload = page.waitForRequest(
    (request) => request.isNavigationRequest() && /\/session\/overview(\?|$)/.test(request.url()),
  );

  await page.getByRole('button', { name: /Bekreft timebestilling/ }).click();

  await overviewReload;
  await page.waitForURL(/\/booking\/public\/appointment\/success\?/);
  await expect(page.getByRole('heading', { name: 'Timen er bestilt' })).toBeVisible();
  expect(blocked).toBe(true);

  const appointments = await db.query<{ count: string }>('select count(*)::text as count from booking.appointments');
  expect(appointments.rows[0]?.count).toBe('1');
});
