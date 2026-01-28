import { describe, expect, it } from 'vitest';
import { ROUTES_MAP, ROUTE_TREE } from '~/lib/route-tree';

describe('company.booking.appointments.create.route', () => {
  it('registers exactly two nested create routes in route map and route tree', () => {
    expect(ROUTES_MAP['company.booking.appointments.create.existing-user']?.href).toBe(
      '/company/booking/appointments/create/existing-user',
    );
    expect(ROUTES_MAP['company.booking.appointments.create.new-user']?.href).toBe(
      '/company/booking/appointments/create/new-user',
    );

    const companyBranch = ROUTE_TREE.find((branch) => branch.id === 'company');
    const bookingBranch = companyBranch?.children?.find((branch) => branch.id === 'company.booking');
    const appointmentsBranch = bookingBranch?.children?.find((branch) => branch.id === 'company.booking.appointments');
    const createBranch = appointmentsBranch?.children?.find((branch) => branch.id === 'company.booking.appointments.create');

    expect(createBranch?.children).toHaveLength(2);
    expect(createBranch?.children?.map((child) => child.id).sort()).toEqual([
      'company.booking.appointments.create.existing-user',
      'company.booking.appointments.create.new-user',
    ]);
  });
});

