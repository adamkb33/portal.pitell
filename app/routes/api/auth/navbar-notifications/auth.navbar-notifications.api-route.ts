import { data, type LoaderFunctionArgs } from 'react-router';
import { CompanyUserInAppNotificationController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { serializeQueryParams } from '~/lib/query';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const payload = await withAuth(request, async () => {
      const [latestResponse, unreadResponse] = await Promise.all([
        CompanyUserInAppNotificationController.getInAppNotifications({
          query: {
            request: {
              page: 0,
              size: 5,
              sortBy: 'createdAt',
              sortDirection: 'DESC',
            },
          },
          paramsSerializer: (params) => serializeQueryParams(params.request),
        }),
        CompanyUserInAppNotificationController.getInAppNotifications({
          query: {
            request: {
              page: 0,
              size: 1,
              sortBy: 'createdAt',
              sortDirection: 'DESC',
              read: false,
            },
          },
          paramsSerializer: (params) => serializeQueryParams(params.request),
        }),
      ]);

      const unreadCount = unreadResponse.data?.data?.totalElements ?? 0;

      return {
        items: latestResponse.data?.data?.content ?? [],
        hasUnread: unreadCount > 0,
        unreadCount,
      };
    });

    return data(payload);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente varsler');
    // Degrade gracefully for auth/authorization failures to avoid noisy UI churn.
    if (status === 401 || status === 403) {
      return data({ items: [], hasUnread: false, unreadCount: 0, error: null }, { status: 200 });
    }

    return data({ items: [], hasUnread: false, unreadCount: 0, error: message }, { status: status ?? 500 });
  }
}
