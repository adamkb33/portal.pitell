import type { Pool } from 'pg';
import { selectServices } from './booking-flow.helpers';
import { expect, resetMutableBookingState, test } from './fixtures';

/** Seven more groups for company 1 (one service each, offered by booking profile 1), so the chips no longer fit. */
const EXTRA_GROUPS = [
  { id: 101, name: 'Farge', service: 'Bunnfarge' },
  { id: 102, name: 'Striper', service: 'Striper kort hår' },
  { id: 103, name: 'Behandlinger', service: 'Hodebunnsbehandling' },
  { id: 104, name: 'Bryn og vipper', service: 'Farge bryn' },
  { id: 105, name: 'Brudefrisyre', service: 'Prøvefrisyre' },
  { id: 106, name: 'Barn', service: 'Barneklipp' },
  { id: 107, name: 'Pakker', service: 'Klipp og skjegg' },
];

async function addExtraGroups(db: Pool) {
  await removeExtraGroups(db);
  for (const group of EXTRA_GROUPS) {
    await db.query(`insert into booking.service_groups (id, company_id, name) values ($1, 1, $2)`, [
      group.id,
      group.name,
    ]);
    await db.query(
      `insert into booking.services (id, company_id, service_group_id, name, price, duration) values ($1, 1, $1, $2, 500, 30)`,
      [group.id, group.service],
    );
    await db.query(
      `insert into booking.booking_profile_services (id, profile_id, service_id, created_at, updated_at) values ($1, 1, $1, now(), now())`,
      [group.id],
    );
  }
}

async function removeExtraGroups(db: Pool) {
  const ids = EXTRA_GROUPS.map((group) => group.id);
  await db.query('delete from booking.booking_profile_services where id = any($1::bigint[])', [ids]);
  await db.query('delete from booking.services where id = any($1::bigint[])', [ids]);
  await db.query('delete from booking.service_groups where id = any($1::bigint[])', [ids]);
}

async function openServiceStep(page: import('@playwright/test').Page) {
  await page.goto('/booking/public/appointment/session?companyId=1&reset=1');
  await page.waitForURL(/\/select-services/);
}

test.beforeEach(async ({ db }) => {
  await resetMutableBookingState(db);
});

test.afterEach(async ({ db }) => {
  await removeExtraGroups(db);
});

test('phone: group chips jump to a group and count what is chosen in it', async ({ page }) => {
  await openServiceStep(page);

  const chips = page.getByRole('navigation', { name: 'Grupper' });
  await expect(chips.getByRole('button')).toHaveCount(3);
  // Three groups fit on one line, so there is no "Grupper" sheet.
  await expect(chips.getByRole('button', { name: 'Grupper', exact: true })).toHaveCount(0);
  await expect(chips.getByRole('button').first()).toHaveAttribute('aria-current', 'true');
  await expect(page.getByText('Prisene er veiledende')).toHaveCount(0);

  await selectServices(page, ['Skjeggtrim']);
  await expect(chips.getByRole('button', { name: /^Skjegg.*1 valgt/ })).toBeVisible();
  await expect(page.getByText(/^1 valgt · /)).toBeVisible();

  await chips.getByRole('button', { name: /^Skjegg/ }).click();
  await expect(chips.getByRole('button', { name: /^Skjegg/ })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('heading', { name: 'Skjegg', level: 2 })).toBeInViewport();
});

test('phone: with many groups, "Grupper" opens a sheet that jumps to any group', async ({ page, db }) => {
  await addExtraGroups(db);
  await openServiceStep(page);

  const chips = page.getByRole('navigation', { name: 'Grupper' });
  await chips.getByRole('button', { name: 'Grupper', exact: true }).click();

  const sheet = page.getByRole('dialog', { name: 'Grupper' });
  await expect(sheet.getByRole('button')).toHaveCount(3 + EXTRA_GROUPS.length);
  await sheet.getByRole('button', { name: /^Pakker/ }).click();

  await expect(sheet).toBeHidden();
  const heading = page.getByRole('heading', { name: 'Pakker', level: 2 });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  // The page has scrolled down, so the chips are stuck under the header with the chosen group filled and in sight.
  const pakkerChip = chips.getByRole('button', { name: /^Pakker/ });
  await expect(pakkerChip).toHaveAttribute('aria-current', 'true');
  await expect(pakkerChip).toBeInViewport();
  await expect(chips.getByRole('button', { name: 'Grupper', exact: true })).toBeInViewport();
});

test('desktop: the groups stay in a list on the left and jump to a group', async ({ page, db }) => {
  await addExtraGroups(db);
  await page.setViewportSize({ width: 1280, height: 900 });
  await openServiceStep(page);

  // One "Grupper" navigation on screen: the list. The chips are phone-only.
  const list = page.getByRole('navigation', { name: 'Grupper' });
  await expect(list).toHaveCount(1);
  await expect(list.getByRole('button', { name: 'Grupper', exact: true })).toHaveCount(0);
  await expect(list.getByRole('button')).toHaveCount(3 + EXTRA_GROUPS.length);

  await list.getByRole('button', { name: /^Pakker/ }).click();
  await expect(list.getByRole('button', { name: /^Pakker/ })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('heading', { name: 'Pakker', level: 2 })).toBeInViewport();
  // The list stays in view while the services scroll.
  await expect(list).toBeInViewport();
});
