import { Outlet, useOutletContext } from 'react-router';
import { BookingBackground } from '~/components/layout/page-backgrounds';
import type { RootOutletContext } from '../root.layout';

export default function BookingLayout() {
  const context = useOutletContext<RootOutletContext | undefined>();
  return (
    <>
      <BookingBackground />
      <Outlet context={context} />
    </>
  );
}
