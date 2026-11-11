import { CalendarOff, CalendarPlus } from 'lucide-react';
import { AreaSwitch } from '~/routes/_components/area-switch';

/** The Tilgjengelighet area's switch: Bookbar tid | Fravær. */
export function AvailabilityAreaSwitch({ className }: { className?: string }) {
  return (
    <AreaSwitch
      label="Bytt mellom bookbar tid og fravær"
      className={className}
      pages={[
        { routeId: 'company.booking.schedule.availabilities', label: 'Bookbar tid', icon: CalendarPlus },
        { routeId: 'company.booking.schedule-unavailability', label: 'Fravær', icon: CalendarOff },
      ]}
    />
  );
}
