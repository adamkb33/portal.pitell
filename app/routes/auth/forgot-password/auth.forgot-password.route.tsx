import { redirect } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

/** "Glemt passord?" now lives in sign-in: type the number or email, get a code, choose a new password. */
export function loader() {
  return redirect(ROUTES_MAP['auth.sign-in'].href);
}

export default function AuthForgotPassword() {
  return null;
}
