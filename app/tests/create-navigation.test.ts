import { describe, it, expect } from 'vitest';
import { createNavigation, RoutePlaceMent } from '~/lib/routing/route-tree';
import type { UserContextDto } from '~/api/generated';

const createUserContext = (
  roles: Array<'ADMIN' | 'EMPLOYEE'>,
  products: Array<'BOOKING' | 'EVENT' | 'OFFER' | 'MARKETING' | 'TIMESHEET'> = ['BOOKING'],
): UserContextDto => ({
  user: {
    id: 1,
    givenName: 'Test',
    familyName: 'User',
    email: 'test@example.com',
    emailVerified: true,
    mobileVerified: false,
    hasPassword: true,
    accountStatus: 'FULL',
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

  it('hides company context link when user has one company', () => {
    const nav = createNavigation(createUserContext(['ADMIN']));
    expect(nav[RoutePlaceMent.NAVIGATION].some((route) => route.id === 'user.company-context')).toBe(false);
  });

  it('shows company context link when user has multiple companies', () => {
    const userContext = createUserContext(['ADMIN']);
    const membership = userContext.companies[0];
    userContext.companies.push({
      ...membership,
      company: { id: 101, orgNumber: '987654321', name: 'Second company' },
    });
    const nav = createNavigation(userContext);
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

  it('shows marketing to an admin whose company has MARKETING, without its hidden pages', () => {
    const nav = createNavigation(createUserContext(['ADMIN'], ['MARKETING']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    const marketing = company?.children?.find((c) => c.id === 'company.marketing');
    expect(marketing).toMatchObject({ href: '/company/marketing', label: 'Markedsføring', iconName: 'Megaphone' });
    expect(marketing?.children).toBeUndefined();
  });

  it('hides marketing from an employee even when the company has MARKETING', () => {
    const nav = createNavigation(createUserContext(['EMPLOYEE'], ['MARKETING']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    expect(company?.children?.find((c) => c.id === 'company.marketing')).toBeUndefined();
  });

  it('hides marketing from an admin whose company lacks MARKETING', () => {
    const nav = createNavigation(createUserContext(['ADMIN'], ['BOOKING']));
    const company = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'company');
    expect(company?.children?.find((c) => c.id === 'company.marketing')).toBeUndefined();
  });

  it('includes system-admin sidebar routes for system admins', () => {
    const nav = createNavigation(createUserContext(['ADMIN']), ['SYSTEM_ADMIN']);
    const systemAdmin = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'system-admin');
    const companies = systemAdmin?.children?.find((c) => c.id === 'system-admin.companies');
    const reviews = companies?.children?.find((c) => c.id === 'system-admin.companies.reviews');

    expect(systemAdmin).toBeDefined();
    expect(systemAdmin?.children?.map((child) => child.id)).toEqual(
      expect.arrayContaining([
        'system-admin.users',
        'system-admin.companies',
        'system-admin.diagnostics',
        'system-admin.smtp',
      ]),
    );
    expect(reviews).toBeDefined();
  });

  it('hides system-admin sidebar routes for non-system admins', () => {
    const nav = createNavigation(createUserContext(['ADMIN']));
    const systemAdmin = nav[RoutePlaceMent.SIDEBAR].find((r) => r.id === 'system-admin');
    expect(systemAdmin).toBeUndefined();
  });
});
