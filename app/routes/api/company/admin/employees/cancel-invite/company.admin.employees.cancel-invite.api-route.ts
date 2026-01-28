import { type ActionFunctionArgs } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import { AdminCompanyController } from '~/api/generated/identity';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const tokenId = formData.get('id');

  if (!tokenId) {
    return { error: 'Invite token not provided' };
  }

  await withAuth(request, async () => {
    await AdminCompanyController.cancelCompanyUserInvite({
      path: {
        inviteTokenId: Number(tokenId),
      },
    });
  });

  return redirectWithSuccess(request, ROUTES_MAP['company.admin.employees'].href, 'Invitasjon kansellert');
}
