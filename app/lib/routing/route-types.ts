import type { IconName } from './route-icon-map';

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
  /**
   * Route id of the page one level up, when it differs from the tree parent (the URL). The domain map decides
   * (ui-rules → Page top): e.g. Bookbar tid lives under Kalender's URL but belongs to Booking. Drives the breadcrumb
   * and the phone header's ‹ arrow.
   */
  up?: string;
  /** Where this branch's breadcrumb links when its own page isn't meant to be opened (Bruker → Min profil). */
  crumbTo?: string;
};

export type ApiRoute = {
  id: string;
  url: string;
  children?: ApiRoute[];
};
