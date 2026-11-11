import { Outlet } from 'react-router';

export default function BookingPublicLayout() {
  return (
    <div className="mx-auto w-full max-w-[var(--booking-content-width)]">
      <Outlet />
    </div>
  );
}
