export enum Access {
  PUBLIC = 'PUBLIC',
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  AUTHENTICATED = 'AUTHENTICATED',
  ROLE = 'ROLE',
  PRODUCT = 'PRODUCT',
}

export enum BrachCategory {
  PUBLIC = 'PUBLIC',
  AUTH = 'AUTH',
  NONE = 'NONE',
  COMPANY = 'COMPANY',
  USER = 'USER',
}

export enum RoutePlaceMent {
  NAVIGATION = 'NAVIGATION',
  SIDEBAR = 'SIDEBAR',
  FOOTER = 'FOOTER',
}

export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export enum CompanyRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

import type { UserContextDto } from '~/api/generated/base';
import type { IconName } from './route-icon-map';

export type RouteBranch = {
  id: string;
  href: string;
  label?: string;
  accessType?: Access;
  placement?: RoutePlaceMent;
  hidden?: boolean;
  category: BrachCategory;
  userRoles?: UserRole[];
  companyRoles?: CompanyRole[];
  iconName?: IconName;
  children?: RouteBranch[];
  excludeLayout?: boolean;
};

export const ROUTE_TREE: RouteBranch[] = [
  {
    id: 'auth',
    href: '/auth',
    label: 'Autentisering',
    category: BrachCategory.AUTH,
    accessType: Access.PUBLIC,
    hidden: true,
    iconName: 'Key',
    children: [
      {
        id: 'auth.sign-in',
        href: '/auth/sign-in',
        label: 'Logg inn',
        category: BrachCategory.AUTH,
        placement: RoutePlaceMent.NAVIGATION,
        accessType: Access.NOT_AUTHENTICATED,
        iconName: 'LogIn',
        excludeLayout: true,
      },
      {
        id: 'auth.sign-up',
        href: '/auth/sign-up',
        label: 'Opprett konto',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        iconName: 'UserPlus',
      },
      {
        id: 'auth.check-email',
        href: '/auth/check-email',
        label: 'Sjekk e-post',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        hidden: true,
      },
      {
        id: 'auth.collect-email',
        href: '/auth/collect-email',
        label: 'Legg til e-post',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        hidden: true,
      },
      {
        id: 'auth.collect-mobile',
        href: '/auth/collect-mobile',
        label: 'Legg til mobil',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        hidden: true,
      },
      {
        id: 'auth.forgot-password',
        href: '/auth/forgot-password',
        label: 'Glemt passord',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        iconName: 'Key',
      },
      {
        id: 'auth.reset-password',
        href: '/auth/reset-password',
        label: 'Tilbakestill passord',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        iconName: 'Key',
      },
      {
        id: 'auth.verify-email',
        href: '/auth/verify-email',
        label: 'Bekreft e-post',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        hidden: true,
      },
      {
        id: 'auth.verify-mobile',
        href: '/auth/verify-mobile',
        label: 'Bekreft mobil',
        category: BrachCategory.AUTH,
        accessType: Access.NOT_AUTHENTICATED,
        hidden: true,
      },
      {
        id: 'auth.respond-invite',
        href: '/auth/respond-invite',
        label: 'Aksepter invitasjon',
        category: BrachCategory.NONE,
        accessType: Access.NOT_AUTHENTICATED,
        iconName: 'UserPlus',
      },
      {
        id: 'auth.respond-user-invite',
        href: '/auth/respond-user-invite',
        label: 'Aksepter brukerinvitasjon',
        category: BrachCategory.NONE,
        accessType: Access.NOT_AUTHENTICATED,
        iconName: 'UserPlus',
      },
      {
        id: 'auth.sign-out',
        href: '/auth/sign-out',
        label: 'Logg ut',
        category: BrachCategory.AUTH,
        placement: RoutePlaceMent.NAVIGATION,
        accessType: Access.AUTHENTICATED,
        iconName: 'LogOut',
      },
    ],
  },
  {
    id: 'user',
    href: '/user',
    label: 'Bruker',
    category: BrachCategory.USER,
    accessType: Access.PUBLIC,
    hidden: true,
    iconName: 'UserCircle',
    children: [
      {
        id: 'user.profile',
        href: '/user/profile',
        label: 'Min profil',
        category: BrachCategory.USER,
        placement: RoutePlaceMent.NAVIGATION,
        accessType: Access.AUTHENTICATED,
        iconName: 'UserCircle',
      },
      {
        id: 'user.company-context',
        href: '/user/company-context',
        label: 'Mine selskap',
        category: BrachCategory.USER,
        placement: RoutePlaceMent.NAVIGATION,
        accessType: Access.AUTHENTICATED,
        iconName: 'Building2',
      },
    ],
  },
  {
    id: 'company',
    href: '/company',
    label: 'Mitt selskap',
    category: BrachCategory.COMPANY,
    placement: RoutePlaceMent.SIDEBAR,
    accessType: Access.ROLE,
    companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
    iconName: 'Building2',
    children: [
      {
        id: 'company.request-role-delete',
        href: '/company/request-role-delete',
        label: 'Etterspørsel om å slette rolle',
        category: BrachCategory.NONE,
        hidden: true,
        accessType: Access.ROLE,
        companyRoles: [CompanyRole.ADMIN],
      },
      {
        id: 'company.admin',
        href: '/company/admin',
        label: 'Administrasjon',
        category: BrachCategory.NONE,
        accessType: Access.ROLE,
        companyRoles: [CompanyRole.ADMIN],
        iconName: 'Settings',
        children: [
          {
            id: 'company.admin.settings',
            href: '/company/admin/settings',
            hidden: true,
            label: 'Instillinger',
            category: BrachCategory.COMPANY,
            accessType: Access.ROLE,
            companyRoles: [CompanyRole.ADMIN],
            iconName: 'Settings',
          },
          {
            id: 'company.admin.employees',
            href: '/company/admin/employees',
            label: 'Ansatte',
            category: BrachCategory.COMPANY,
            accessType: Access.ROLE,
            companyRoles: [CompanyRole.ADMIN],
            iconName: 'Users',
          },
          {
            id: 'company.admin.contacts',
            href: '/company/admin/contacts',
            label: 'Kontakter',
            category: BrachCategory.COMPANY,
            accessType: Access.ROLE,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
            iconName: 'Users',
          },
        ],
      },
      {
        id: 'company.booking',
        href: '/company/booking',
        label: 'Booking',
        category: BrachCategory.COMPANY,
        placement: RoutePlaceMent.SIDEBAR,
        accessType: Access.PRODUCT,
        companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
        iconName: 'Calendar',
        children: [
          {
            id: 'company.booking.admin',
            href: '/company/booking/admin',
            label: 'Administrasjon',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            companyRoles: [CompanyRole.ADMIN],
            iconName: 'Settings',
            children: [
              {
                id: 'company.booking.admin.settings',
                href: '/company/booking/admin/settings',
                label: 'Instillinger',
                hidden: true,
                category: BrachCategory.COMPANY,
                accessType: Access.PRODUCT,
                companyRoles: [CompanyRole.ADMIN],
                iconName: 'Settings',
              },
              {
                id: 'company.booking.admin.service-groups',
                href: '/company/booking/admin/service-groups',
                label: 'Tjeneste grupper',
                category: BrachCategory.COMPANY,
                accessType: Access.PRODUCT,
                companyRoles: [CompanyRole.ADMIN],
                iconName: 'FolderKanban',
                children: [
                  {
                    id: 'company.booking.admin.service-groups.services',
                    href: '/company/booking/admin/service-groups/services',
                    label: 'Tjenester',
                    category: BrachCategory.COMPANY,
                    accessType: Access.PRODUCT,
                    companyRoles: [CompanyRole.ADMIN],
                    iconName: 'Briefcase',
                  },
                ],
              },
            ],
          },
          {
            id: 'company.booking.profile',
            href: '/company/booking/profile',
            label: 'Min booking profil',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
            iconName: 'UserCircle',
            children: [
              {
                id: 'company.booking.profile.schedule-unavailability',
                href: '/company/booking/profile/schedule-unavailability',
                label: 'Mitt ferie avik',
                category: BrachCategory.COMPANY,
                accessType: Access.PRODUCT,
                companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
              },
            ],
          },
          {
            id: 'company.booking.appointments',
            href: '/company/booking/appointments',
            label: 'Time bestillinger',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
            iconName: 'ClipboardList',
            children: [
              {
                id: 'company.booking.appointments.create',
                href: '/company/booking/appointments/create',
                label: 'Bestill ny time',
                category: BrachCategory.COMPANY,
                accessType: Access.PRODUCT,
                companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
                iconName: 'Calendar',
                children: [
                  {
                    id: 'company.booking.appointments.create.existing-user',
                    href: '/company/booking/appointments/create/existing-user',
                    category: BrachCategory.NONE,
                    accessType: Access.PRODUCT,
                    companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
                    hidden: true,
                  },
                  {
                    id: 'company.booking.appointments.create.new-user',
                    href: '/company/booking/appointments/create/new-user',
                    category: BrachCategory.NONE,
                    accessType: Access.PRODUCT,
                    companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
                    hidden: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'company.notifications',
        href: '/company/notifications',
        label: 'Varsler',
        category: BrachCategory.COMPANY,
        placement: RoutePlaceMent.SIDEBAR,
        accessType: Access.ROLE,
        companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
        iconName: 'Bell',
        children: [
          {
            id: 'company.notifications.view',
            href: '/company/notifications/:id',
            label: 'Vis varsel',
            category: BrachCategory.COMPANY,
            accessType: Access.ROLE,
            placement: RoutePlaceMent.SIDEBAR,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
            hidden: true,
          },
        ],
      },
      {
        id: 'company.timesheet',
        href: '/company/timesheets',
        label: 'Timelister',
        category: BrachCategory.COMPANY,
        placement: RoutePlaceMent.SIDEBAR,
        accessType: Access.PRODUCT,
        companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
        iconName: 'Clock',
        children: [
          {
            id: 'company.timesheet.admin',
            href: '/company/timesheets/admin',
            label: 'Administrasjon',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            placement: RoutePlaceMent.SIDEBAR,
            companyRoles: [CompanyRole.ADMIN],
            children: [
              {
                id: 'company.timesheet.admin.submissions',
                href: '/company/timesheets/admin/submissions',
                label: 'Innsendinger',
                category: BrachCategory.COMPANY,
                accessType: Access.PRODUCT,
                placement: RoutePlaceMent.SIDEBAR,
                companyRoles: [CompanyRole.ADMIN],
              },
            ],
          },
          {
            id: 'company.timesheet.register',
            href: '/company/timesheets/register',
            label: 'Registrer timer',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            placement: RoutePlaceMent.SIDEBAR,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
          },
          {
            id: 'company.timesheet.edit-range',
            href: '/company/timesheets/range/:id',
            label: 'Rediger tidsintervall',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            placement: RoutePlaceMent.SIDEBAR,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
            hidden: true,
          },
          {
            id: 'company.timesheet.edit-hours',
            href: '/company/timesheets/hours/:id',
            label: 'Rediger timerregistrering',
            category: BrachCategory.COMPANY,
            accessType: Access.PRODUCT,
            placement: RoutePlaceMent.SIDEBAR,
            companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
            hidden: true,
          },
        ],
      },
    ],
  },
  {
    id: 'booking',
    href: '/booking',
    label: 'BiT Booking',
    category: BrachCategory.PUBLIC,
    accessType: Access.PUBLIC,
    iconName: 'Calendar',
    children: [
      {
        id: 'booking.public',
        href: '/booking/public',
        label: 'Bestill time',
        category: BrachCategory.PUBLIC,
        accessType: Access.PUBLIC,
        iconName: 'Calendar',
        children: [
          {
            id: 'booking.public.appointment',
            href: '/booking/public/appointment',
            category: BrachCategory.PUBLIC,
            accessType: Access.PUBLIC,
            children: [
              {
                id: 'booking.public.appointment.session',
                href: '/booking/public/appointment/session',
                category: BrachCategory.PUBLIC,
                accessType: Access.PUBLIC,
                children: [
                  {
                    id: 'booking.public.appointment.session.contact',
                    href: '/booking/public/appointment/session/contact',
                    label: 'Bruker',
                    category: BrachCategory.NONE,
                    accessType: Access.PUBLIC,
                    hidden: true,
                    iconName: 'Users',
                    children: [
                      {
                        id: 'booking.public.appointment.session.contact.sign-in',
                        href: '/booking/public/appointment/session/contact/sign-in',
                        category: BrachCategory.NONE,
                        accessType: Access.PUBLIC,
                        excludeLayout: true,
                      },
                      {
                        id: 'booking.public.appointment.session.contact.sign-up',
                        href: '/booking/public/appointment/session/contact/sign-up',
                        category: BrachCategory.NONE,
                        accessType: Access.PUBLIC,
                        excludeLayout: true,
                      },
                      {
                        id: 'booking.public.appointment.session.contact.verify-email',
                        href: '/booking/public/appointment/session/contact/verify-email',
                        category: BrachCategory.NONE,
                        accessType: Access.PUBLIC,
                        excludeLayout: true,
                      },
                      {
                        id: 'booking.public.appointment.session.contact.verify-mobile',
                        href: '/booking/public/appointment/session/contact/verify-mobile',
                        category: BrachCategory.NONE,
                        accessType: Access.PUBLIC,
                        excludeLayout: true,
                      },
                      {
                        id: 'booking.public.appointment.session.contact.collect-email',
                        href: '/booking/public/appointment/session/contact/collect-email',
                        category: BrachCategory.NONE,
                        accessType: Access.PUBLIC,
                        excludeLayout: true,
                      },
                      {
                        id: 'booking.public.appointment.session.contact.collect-mobile',
                        href: '/booking/public/appointment/session/contact/collect-mobile',
                        category: BrachCategory.NONE,
                        accessType: Access.PUBLIC,
                        excludeLayout: true,
                      },
                    ],
                  },
                  {
                    id: 'booking.public.appointment.session.employee',
                    href: '/booking/public/appointment/session/employee',
                    label: 'Velg behandler',
                    category: BrachCategory.NONE,
                    accessType: Access.PUBLIC,
                    hidden: true,
                    iconName: 'UserCircle',
                  },
                  {
                    id: 'booking.public.appointment.session.select-services',
                    href: '/booking/public/appointment/session/select-services',
                    label: 'Velg tjenester',
                    category: BrachCategory.NONE,
                    accessType: Access.PUBLIC,
                    hidden: true,
                    iconName: 'Briefcase',
                  },
                  {
                    id: 'booking.public.appointment.session.select-time',
                    href: '/booking/public/appointment/session/select-time',
                    label: 'Velg tidspunkt',
                    category: BrachCategory.NONE,
                    accessType: Access.PUBLIC,
                    hidden: true,
                    iconName: 'Clock',
                  },
                  {
                    id: 'booking.public.appointment.session.overview',
                    href: '/booking/public/appointment/session/overview',
                    label: 'Oversikt',
                    category: BrachCategory.NONE,
                    accessType: Access.PUBLIC,
                    hidden: true,
                    iconName: 'ClipboardList',
                  },
                ],
              },
              {
                id: 'booking.public.appointment.success',
                href: '/booking/public/appointment/success',
                category: BrachCategory.NONE,
                accessType: Access.PUBLIC,
                hidden: true,
              },
              {
                id: 'booking.public.appointment.cancel',
                href: '/booking/public/appointment/cancel',
                category: BrachCategory.NONE,
                accessType: Access.PUBLIC,
                hidden: true,
              },
            ],
          },
          {
            id: 'booking.public.my-appointments',
            href: '/booking/public/my-appointments',
            label: 'Mine bookinger',
            category: BrachCategory.USER,
            placement: RoutePlaceMent.NAVIGATION,
            accessType: Access.AUTHENTICATED,
          },
        ],
      },
    ],
  },
];

export type ApiRoute = {
  id: string;
  url: string;
  children?: ApiRoute[];
};

export const API_ROUTES_TREE = [
  {
    id: 'public',
    url: '/api/public',
    children: [
      {
        id: 'public.booking',
        url: '/api/public/booking',
        children: [
          {
            id: 'public.booking.session',
            url: '/api/public/booking/session',
            children: [
              {
                id: 'public.booking.session.attach-user',
                url: '/api/public/booking/session/attach-user',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'auth',
    url: '/api/auth',
    children: [
      {
        id: 'auth.verify-mobile',
        url: '/api/auth/verify-mobile',
      },
      {
        id: 'auth.resend-verification',
        url: '/api/auth/resend-verification',
        children: [
          {
            id: 'auth.resend-verification.email',
            url: '/api/auth/resend-verification/email',
          },
          {
            id: 'auth.resend-verification.mobile',
            url: '/api/auth/resend-verification/mobile',
          },
        ],
      },
      {
        id: 'auth.user-status',
        url: '/api/auth/user-status',
      },
    ],
  },
  {
    id: 'company',
    url: '/company',
    children: [
      {
        id: 'company.admin',
        url: '/company/admin',
        children: [
          {
            id: 'company.admin.employees',
            url: '/company/admin/employees',
            children: [
              {
                id: 'company.admin.employees.edit',
                url: '/company/admin/employees/edit',
              },
              {
                id: 'company.admin.employees.delete',
                url: '/company/admin/employees/delete',
              },
              {
                id: 'company.admin.employees.invite',
                url: '/company/admin/employees/invite',
              },
              {
                id: 'company.admin.employees.cancel-invite',
                url: '/company/admin/employees/cancel-invite',
              },
            ],
          },
          {
            id: 'company.admin.contacts',
            url: '/company/admin/contacts',
            children: [
              {
                id: 'company.admin.contacts.create',
                url: '/company/admin/contacts/create',
              },
              {
                id: 'company.admin.contacts.update',
                url: '/company/admin/contacts/update',
              },
              {
                id: 'company.admin.contacts.delete',
                url: '/company/admin/contacts/delete',
              },
            ],
          },
        ],
      },
      {
        id: 'company.booking',
        url: '/company/booking',
        children: [
          {
            id: 'company.booking.profile',
            url: '/company/booking/profile',
            children: [
              {
                id: 'company.booking.profile.create-or-update',
                url: '/company/booking/profile/create-or-update',
              },
              {
                id: 'company.booking.profile.daily-schedule',
                url: '/company/booking/profile/daily-schedule',
                children: [
                  {
                    id: 'company.booking.profile.daily-schedule.create-or-update',
                    url: '/company/booking/profile/daily-schedule/create-or-update',
                  },
                  {
                    id: 'company.booking.profile.daily-schedule.create-bulk',
                    url: '/company/booking/profile/daily-schedule/create-bulk',
                  },
                  {
                    id: 'company.booking.profile.daily-schedule.delete',
                    url: '/company/booking/profile/daily-schedule/delete',
                  },
                ],
              },
            ],
          },
          {
            id: 'company.booking.admin',
            url: '/company/booking/admin',
            children: [
              {
                id: 'company.booking.admin.service-groups',
                url: '/company/booking/admin/service-groups',
                children: [
                  {
                    id: 'company.booking.admin.service-groups.create',
                    url: '/company/booking/admin/service-groups/create',
                  },
                  {
                    id: 'company.booking.admin.service-groups.update',
                    url: '/company/booking/admin/service-groups/update',
                  },
                  {
                    id: 'company.booking.admin.service-groups.delete',
                    url: '/company/booking/admin/service-groups/delete',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
export const API_ROUTES_MAP: Record<string, { id: string; url: string }> = (() => {
  const map: Record<string, { id: string; url: string }> = {};

  const flattenBranch = (branch: ApiRoute): void => {
    map[branch.id] = {
      id: branch.id,
      url: branch.url,
    };

    if (branch.children) {
      branch.children.forEach((child) => flattenBranch(child));
    }
  };

  API_ROUTES_TREE.forEach((branch) => flattenBranch(branch));
  return map;
})();

export const ROUTES_MAP: Record<string, { id: string; href: string }> = (() => {
  const map: Record<string, { id: string; href: string }> = {};

  const flattenBranch = (branch: RouteBranch): void => {
    map[branch.id] = {
      id: branch.id,
      href: branch.href,
    };

    if (branch.children) {
      branch.children.forEach((child) => flattenBranch(child));
    }
  };

  ROUTE_TREE.forEach((branch) => flattenBranch(branch));
  return map;
})();

export type UserNavigation = Record<RoutePlaceMent, RouteBranch[]>;
const extractProductFromRoute = (routeId: string): 'BOOKING' | 'EVENT' | 'TIMESHEET' | null => {
  const routeParts = routeId.split('.');
  if (routeParts.includes('booking')) return 'BOOKING';
  if (routeParts.includes('event')) return 'EVENT';
  if (routeParts.includes('timesheet')) return 'TIMESHEET';
  return null;
};

const hasCompanyRole = (roles: Array<'ADMIN' | 'EMPLOYEE'>, requiredRoles: CompanyRole[]): boolean => {
  return requiredRoles.some((role) => roles.includes(role));
};

const hasRoleAccessAcrossCompanies = (userContext: UserContextDto, requiredRoles?: CompanyRole[]): boolean => {
  if (!requiredRoles?.length) {
    return true;
  }

  return userContext.companies.some((entry) => hasCompanyRole(entry.roles, requiredRoles));
};

const hasProductAccessAcrossCompanies = (
  userContext: UserContextDto,
  product: 'BOOKING' | 'EVENT' | 'TIMESHEET',
  requiredRoles?: CompanyRole[],
): boolean => {
  return userContext.companies.some((entry) => {
    const hasProduct = entry.products.includes(product);
    if (!hasProduct) {
      return false;
    }

    if (!requiredRoles?.length) {
      return true;
    }

    return hasCompanyRole(entry.roles, requiredRoles);
  });
};

export const createNavigation = (userContext?: UserContextDto | null): UserNavigation => {
  const isAuthenticated = !!userContext?.user;
  const hasCompanyMembership = (userContext?.companies?.length ?? 0) > 0;

  const hasAccess = (branch: RouteBranch): boolean => {
    // Level 0: PUBLIC - always allow
    if (branch.accessType === Access.PUBLIC) {
      return true;
    }

    // Level 1: NOT_AUTHENTICATED - only if no auth
    if (branch.accessType === Access.NOT_AUTHENTICATED) {
      return !isAuthenticated;
    }

    // Level 2: AUTHENTICATED - requires valid JWT
    if (!isAuthenticated) {
      return false;
    }

    if (branch.id === 'user.company-context' && !hasCompanyMembership) {
      return false;
    }

    if (branch.accessType === Access.AUTHENTICATED) {
      return true;
    }

    // Level 3/4: ROLE/PRODUCT - require company membership + role checks
    if (!userContext || !hasCompanyMembership) {
      return false;
    }

    // UserContextDto does not currently include system-level roles.
    if (branch.userRoles?.length) {
      return false;
    }

    // Check company roles
    if (branch.accessType === Access.ROLE && !hasRoleAccessAcrossCompanies(userContext, branch.companyRoles)) {
      return false;
    }

    if (branch.accessType === Access.ROLE) {
      return true;
    }

    if (branch.accessType === Access.PRODUCT) {
      const product = extractProductFromRoute(branch.id);
      if (!product) {
        return false;
      }

      return hasProductAccessAcrossCompanies(userContext, product, branch.companyRoles);
    }

    // Default allow if no specific access type
    return true;
  };

  const filterBranch = (branch: RouteBranch): RouteBranch[] => {
    if (!hasAccess(branch)) {
      return [];
    }

    const childBranches: RouteBranch[] = [];
    if (branch.children) {
      branch.children.forEach((child) => {
        childBranches.push(...filterBranch(child));
      });
    }

    if (branch.hidden) {
      return childBranches;
    }

    const filteredBranch: RouteBranch = {
      id: branch.id,
      href: branch.href,
      label: branch.label,
      accessType: branch.accessType,
      placement: branch.placement,
      hidden: branch.hidden,
      category: branch.category,
      userRoles: branch.userRoles,
      companyRoles: branch.companyRoles,
      iconName: branch.iconName,
      children: childBranches.length > 0 ? childBranches : undefined,
    };

    return [filteredBranch];
  };

  const filteredTree = ROUTE_TREE.flatMap((branch) => filterBranch(branch));

  const collectByPlacement = (branches: RouteBranch[]): RouteBranch[] => {
    const result: RouteBranch[] = [];

    const traverse = (branch: RouteBranch, parentHasPlacement = false) => {
      const hasPlacement = branch.placement !== undefined;

      if (hasPlacement && !parentHasPlacement) {
        result.push(branch);
      }

      if (branch.children) {
        branch.children.forEach((child) => traverse(child, hasPlacement));
      }
    };

    branches.forEach((branch) => traverse(branch, false));
    return result;
  };

  const placementBranches = collectByPlacement(filteredTree);

  const result: UserNavigation = {
    [RoutePlaceMent.NAVIGATION]: [],
    [RoutePlaceMent.SIDEBAR]: [],
    [RoutePlaceMent.FOOTER]: [],
  };

  placementBranches.forEach((branch) => {
    if (branch.placement) {
      result[branch.placement].push(branch);
    }
  });

  return result;
};
