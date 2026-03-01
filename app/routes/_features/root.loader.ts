import { data } from 'react-router';
import { createNavigation } from '~/lib/route-tree';
import { authService } from '~/lib/auth-service';
import { logger } from '~/lib/logger';
import type { FlashMessage } from '~/routes/company/_lib/flash-message.server';
import { AuthController } from '~/api/generated/base';
import type { UserContextDto } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';
import { CompanyUserInAppNotificationController, type InAppNotificationDto } from '~/api/generated/notification';
import { serializeQueryParams } from '~/lib/query';

export type NavbarNotificationsData = {
  items: InAppNotificationDto[];
  hasUnread: boolean;
};

export const refreshAndBuildResponse = async (
  request: Request,
  refreshToken: string,
  flashMessage: FlashMessage | null,
) => {
  try {
    const { accessToken } = await authService.getTokensFromRequest(request);
    const companyId = authService.getCompanyIdFromToken(accessToken ?? '');

    const response = await AuthController.refresh({
      query: { companyId },
      body: { refreshToken },
    });

    const tokens = response.data?.data;

    if (!tokens) {
      throw new Error('Failed to refresh auth tokens');
    }

    const { headers } = await authService.processTokenRefresh(tokens);
    const body = await buildResponseData(request, tokens.accessToken, flashMessage);

    return data(body, { headers });
  } catch (err) {
    logger.error('Token refresh failed', { error: err instanceof Error ? err.message : String(err) });
    return await defaultResponse(flashMessage);
  }
};

export const buildResponseData = async (request: Request, accessToken: string, flashMessage: FlashMessage | null) => {
  const authPayload = authService.verifyAndDecodeToken(accessToken);
  let userContext: UserContextDto | undefined = undefined;
  let companySummary = undefined;
  let navbarNotifications: NavbarNotificationsData | null = null;

  if (authPayload) {
    await withAuth(
      request,
      async () => {
        try {
          const userContextResponse = await AuthController.getUserContext();
          userContext = userContextResponse.data?.data ?? undefined;
        } catch (err) {
          logger.info('Failed to fetch user context', {
            userId: authPayload.id,
            error: err instanceof Error ? err.message : String(err),
          });
          userContext = undefined;
        }
      },
      accessToken,
    );
  }

  if (authPayload?.companyId) {
    navbarNotifications = {
      items: [],
      hasUnread: false,
    };

    await withAuth(
      request,
      async () => {
        try {
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

          navbarNotifications = {
            items: latestResponse.data?.data?.content ?? [],
            hasUnread: (unreadResponse.data?.data?.totalElements ?? 0) > 0,
          };
        } catch (err) {
          logger.info('Failed to fetch navbar notifications', {
            userId: authPayload.id,
            companyId: authPayload.companyId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
      accessToken,
    );
  }

  const companyContexts = (userContext as UserContextDto | undefined)?.companies ?? [];
  if (authPayload?.companyId && companyContexts.length > 0) {
    companySummary = companyContexts.find((entry) => entry.company.id === authPayload.companyId)?.company;
  }

  const navigation = createNavigation(userContext);

  return {
    user: authPayload,
    userNavigation: navigation,
    companyContext: companySummary,
    navbarNotifications,
    flashMessage,
  };
};

export const defaultResponse = async (flashMessage: FlashMessage | null = null) => {
  const headers = await authService.clearAuthCookies();
  return data(
    {
      user: null,
      companyContext: null,
      userNavigation: createNavigation(undefined),
      navbarNotifications: null,
      flashMessage,
    },
    { status: 200, headers },
  );
};
