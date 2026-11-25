import { Outlet, redirect } from 'react-router';
import { logger } from '~/lib/logger';
import { getAuthPayloadFromRequest } from '~/lib/auth.utils';
import type { Route } from './+types/user.layout';
// TODO: Check if user has company context

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const authPayload = await getAuthPayloadFromRequest(request);

    if (!authPayload) {
      return redirect('/');
    }
  } catch (error: any) {
    logger.error('[user.layout] failed', { error });
    if (error as unknown as { body?: { message?: string } }) {
      return { error: error.body.message };
    }

    throw error;
  }
}

export default function UserLayout() {
  return <Outlet />;
}
