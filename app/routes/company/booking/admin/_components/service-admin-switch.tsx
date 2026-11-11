import { Layers, List } from 'lucide-react';
import { AreaSwitch } from '~/routes/_components/area-switch';

/** The Tjenester area's switch: Tjenester | Grupper. */
export function ServiceAdminSwitch({ className }: { className?: string }) {
  return (
    <AreaSwitch
      label="Bytt mellom tjenester og grupper"
      className={className}
      pages={[
        { routeId: 'company.booking.admin.services', label: 'Tjenester', icon: List },
        { routeId: 'company.booking.admin.service-groups', label: 'Grupper', icon: Layers },
      ]}
    />
  );
}
