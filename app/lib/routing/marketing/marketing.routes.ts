import { Access, BrachCategory, type RouteBranch } from '../route-types';

export const MARKETING_ROUTES: RouteBranch[] = [
  {
    id: 'marketing.public',
    href: '/u/:token',
    category: BrachCategory.PUBLIC,
    accessType: Access.PUBLIC,
    hidden: true,
    excludeLayout: true,
  },
];
