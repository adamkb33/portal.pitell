import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { EmployeesTable } from './tables/employees.table';
import { InvitesTable } from './tables/invites.table';
import type { Route } from './+types/company.admin.employees.route';
import { getFlashMessage } from '../../_lib/flash-message.server';
import { AdminCompanyUserController } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';
import { logRouteError, logRouteStart, logRouteSuccess } from '~/lib/route-log';
import { describeAxiosError } from '~/lib/http-log';

export async function loader(args: Route.LoaderArgs) {
  const { request } = args;

  logRouteStart('loader', 'company.admin.employees', args);

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '5');
    const search = url.searchParams.get('search')?.trim() || undefined;

    const [userResponse, inviteResponse, { message }] = await withAuth(request, async () => {
      const userResponsePromise = AdminCompanyUserController.getCompanyUsers({
        query: {
          page,
          size,
          includeDeleted: false,
          search,
        },
      }).catch((error) => {
        logRouteError('loader', 'company.admin.employees.users', args, error, {
          page,
          size,
          search: search ?? null,
        });
        throw error;
      });

      const inviteResponsePromise = AdminCompanyUserController.getInvitations().catch((error) => {
        logRouteError('loader', 'company.admin.employees.invitations', args, error);
        throw error;
      });

      return Promise.all([userResponsePromise, inviteResponsePromise, getFlashMessage(request)]);
    });

    if (!userResponse.data?.data) {
      logRouteError('loader', 'company.admin.employees', args, new Error('Missing users payload'), {
        page,
        size,
        search: search ?? null,
      });
      return { error: 'Kunne ikke hente brukere for selskapet' };
    }

    logRouteSuccess('loader', 'company.admin.employees', args, {
      page,
      size,
      search: search ?? null,
      userCount: userResponse.data.data.content.length,
      inviteCount: inviteResponse.data?.data?.length ?? 0,
    });

    return {
      users: userResponse.data.data.content,
      pagination: {
        page: userResponse.data.data.page,
        size: userResponse.data.data.size,
        totalElements: userResponse.data.data.totalElements,
        totalPages: userResponse.data.data.totalPages,
      },
      invites: inviteResponse.data?.data || [],
      flashMessage: message,
    };
  } catch (error: unknown) {
    logRouteError('loader', 'company.admin.employees', args, error, {
      errorType: error instanceof Error ? error.name : typeof error,
      axios: describeAxiosError(error),
    });
    return { error: error instanceof Error ? error.message : 'En feil oppstod' };
  }
}

export default function CompanyAdminEmployees({ loaderData }: Route.ComponentProps) {
  if ('error' in loaderData) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-red-500">{loaderData.error}</p>
      </div>
    );
  }

  const { users, pagination, invites } = loaderData;

  return (
    <Tabs defaultValue="employees">
      <TabsList>
        <TabsTrigger value="employees">Ansatte</TabsTrigger>
        <TabsTrigger value="invited">Inviterte</TabsTrigger>
      </TabsList>

      <TabsContent value="employees">
        <EmployeesTable users={users} pagination={pagination} />
      </TabsContent>

      <TabsContent value="invited">
        <InvitesTable invites={invites} />
      </TabsContent>
    </Tabs>
  );
}
