import type { ApiRoute } from '../route-types';

export const API_ROUTES_TREE: ApiRoute[] = [
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
        id: 'auth.navbar-notifications',
        url: '/api/auth/navbar-notifications',
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
                id: 'company.admin.employees.invite',
                url: '/company/admin/employees/invite',
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
