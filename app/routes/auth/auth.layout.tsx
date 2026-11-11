import { Outlet } from 'react-router';
import { AuthBackground } from '~/components/layout/page-backgrounds';

export default function AuthLayout() {
  return (
    <>
      <AuthBackground />
      <Outlet />
    </>
  );
}
