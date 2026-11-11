import type { CreateActionHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

export { action, loader } from '../service-groups/services/company.booking.admin.service-groups.services.route';
export { default } from '../service-groups/services/company.booking.admin.service-groups.services.route';

export const handle = {
  createAction: { label: 'Ny tjeneste', to: ROUTES_MAP['company.booking.admin.services.create'].href },
} satisfies CreateActionHandle;
