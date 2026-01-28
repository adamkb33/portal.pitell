import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { EmployeesTable } from './tables/employees.table';
import { InvitesTable } from './tables/invites.table';
import type { Route } from './+types/company.admin.employees.route';
import { getFlashMessage } from '../../_lib/flash-message.server';
import { AdminCompanyUserController } from '~/api/generated/identity';
import { withAuth } from '~/api/utils/with-auth';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '5');
    const search = url.searchParams.get('search')?.trim() || undefined;

    const [userResponse, inviteResponse, { message }] = await withAuth(request, async () => {
      return Promise.all([
        AdminCompanyUserController.getCompanyUsers({
          query: {
            page,
            size,
            includeDeleted: false,
            search,
          },
        }),
        AdminCompanyUserController.getInvitations(),
        getFlashMessage(request),
      ]);
    });

    if (!userResponse.data?.data) {
      return { error: 'Kunne ikke hente brukere for selskapet' };
    }

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
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'En feil oppstod' };
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
