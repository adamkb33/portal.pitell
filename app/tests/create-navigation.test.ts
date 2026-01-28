import { describe, it, expect } from 'vitest';
import { createNavigation, RoutePlaceMent } from '~/lib/route-tree';
import type { UserContextDto } from '~/api/generated/identity';

const createUserContext = (
  roles: Array<'ADMIN' | 'EMPLOYEE'>,
  products: Array<'BOOKING' | 'EVENT' | 'TIMESHEET'> = ['BOOKING'],
): UserContextDto => ({
  user: {
    id: 1,
    givenName: 'Test',
    familyName: 'User',
    email: 'test@example.com',
    emailVerified: true,
    mobileVerified: false,
  },
  companies: [
    {
      company: {
        id: 100,
        orgNumber: '123456789',
        name: 'BiT AS',
      },
      roles,
      products,
    },
  ],
});

describe('createNavigation', () => {
  it('shows sign-in for unauthenticated users', () => {
    const nav = createNavigation(undefined);
    const signIn = nav[RoutePlaceMent.NAVIGATION].find((r) => r.id === 'auth.sign-in');
    expect(signIn).toBeDefined();
  });

  it('hides sign-in and shows sign-out for authenticated users', () => {
    const nav = createNavigation(createUserContext(['ADMIN']));
    const signIn = nav[RoutePlaceMent.NAVIGATION].find((r) => r.id === 'auth.sign-in');
    const signOut = nav[RoutePlaceMent.NAVIGATION].find((r) => r.id === 'auth.sign-out');
    expect(signIn).toBeUndefined();
    expect(signOut).toBeDefined();
  });

  it('hides company context link when user has no memberships', () => {
    const nav = createNavigation({
      user: createUserContext(['ADMIN']).user,
      companies: [],
    });
    const companyContext = nav[RoutePlaceMent.NAVIGATION].find((r) => r.id === 'user.company-context');
    expect(companyContext).toBeUndefined();
  });

  it('shows company context link when user has memberships', () => {
    const nav = createNavigation(createUserContext(['ADMIN']));
    const companyContext = nav[RoutePlaceMent.NAVIGATION].find((r) => r.id === 'user.company-context');
    expect(companyContext).toBeDefined();
  });

  it('shows admin sidebar sections for admin role', () => {
    const nav = createNavigation(createUserContext(['ADMIN']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    const admin = company?.children?.find((c) => c.id === 'company.admin');
    expect(company).toBeDefined();
    expect(admin).toBeDefined();
  });

  it('hides admin-only section for employee role', () => {
    const nav = createNavigation(createUserContext(['EMPLOYEE']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    const admin = company?.children?.find((c) => c.id === 'company.admin');
    expect(company).toBeDefined();
    expect(admin).toBeUndefined();
  });

  it('includes company sidebar for employee role', () => {
    const nav = createNavigation(createUserContext(['EMPLOYEE']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    expect(company).toBeDefined();
  });

  it('hides booking section when user has no BOOKING product', () => {
    const nav = createNavigation(createUserContext(['ADMIN'], ['EVENT']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    const booking = company?.children?.find((c) => c.id === 'company.booking');
    expect(booking).toBeUndefined();
  });
});
