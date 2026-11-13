import { Access, BrachCategory, type RouteBranch } from '../route-types';

export const LEGAL_ROUTES: RouteBranch[] = [
  {
    id: 'legal.privacy',
    href: '/personvern',
    category: BrachCategory.PUBLIC,
    accessType: Access.PUBLIC,
    hidden: true,
    excludeLayout: true,
  },
  {
    id: 'legal.terms',
    href: '/vilkar',
    category: BrachCategory.PUBLIC,
    accessType: Access.PUBLIC,
    hidden: true,
    excludeLayout: true,
  },
];
