import { Outlet } from 'react-router';
import { AuthBackground } from '~/ui/layout/page-backgrounds';

export default function AuthLayout() {
  return (
    <>
      <AuthBackground />
      <Outlet />
    </>
  );
}
