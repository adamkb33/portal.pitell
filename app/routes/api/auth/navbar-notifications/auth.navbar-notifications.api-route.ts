import { data, type LoaderFunctionArgs } from 'react-router';
import { CompanyUserInAppNotificationController } from '~/api/generated/notification';
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

      return {
        items: latestResponse.data?.data?.content ?? [],
        hasUnread: (unreadResponse.data?.data?.totalElements ?? 0) > 0,
      };
    });

    return data(payload);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente varsler');
    return data({ items: [], hasUnread: false, error: message }, { status: status ?? 401 });
  }
}
