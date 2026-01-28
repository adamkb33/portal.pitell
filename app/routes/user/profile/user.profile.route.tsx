import { data } from 'react-router';
import { authService } from '~/lib/auth-service';
import type { Route } from './+types/user.profile.route';

export async function loader({ request }: Route.LoaderArgs) {
  await authService.requireAuth(request);

  return data({
    user: null,
  });
}

export default function Profile() {
  return <div></div>;
}
