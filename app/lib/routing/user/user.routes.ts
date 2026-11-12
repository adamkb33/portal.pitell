import { Access, BrachCategory, RoutePlaceMent, type RouteBranch } from '../route-types';

export const USER_ROUTES: RouteBranch[] = [
  {
    id: 'user',
    href: '/user',
    label: 'Bruker',
    category: BrachCategory.USER,
    accessType: Access.PUBLIC,
    hidden: true,
    iconName: 'UserCircle',
    // /user itself is a raw payload page; the account's crumb leads to Min profil.
    crumbTo: '/user/profile',
    children: [
      {
        id: 'user.profile',
        href: '/user/profile',
        label: 'Min profil',
        category: BrachCategory.USER,
        placement: RoutePlaceMent.NAVIGATION,
        accessType: Access.AUTHENTICATED,
        iconName: 'UserCircle',
        children: [
          {
            id: 'user.profile.password',
            href: '/user/profile/passord',
            label: 'Endre passord',
            category: BrachCategory.USER,
            accessType: Access.AUTHENTICATED,
            hidden: true,
            excludeLayout: true,
          },
        ],
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
];
