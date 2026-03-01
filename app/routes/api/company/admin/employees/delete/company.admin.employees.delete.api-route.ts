import { type ActionFunctionArgs } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithError, redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import { AdminCompanyUserController } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId');

    if (!userId) {
      return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, 'Bruker-ID mangler');
    }

    await withAuth(request, async () => {
      await AdminCompanyUserController.deleteCompanyUser({
        path: {
          userId: Number(userId),
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.admin.employees'].href, 'Ansatt fjernet');
  } catch (error: any) {
    console.error(error);
    const errorMessage = error?.message || 'Kunne ikke fjerne ansatt';
    return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, errorMessage);
  }
}
