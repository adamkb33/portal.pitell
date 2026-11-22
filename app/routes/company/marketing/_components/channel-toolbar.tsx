import { Megaphone, Users } from 'lucide-react';
import { AreaSwitch } from '~/routes/_components/area-switch';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import type { CampaignChannel } from '../_utils/campaigns';
import { channelRouteId } from '../_utils/channels';

/**
 * The top of an E-post or SMS page: the area switch Kampanjer | Mottakere for that channel, then the create button
 * on the right from `lg` (Ny e-post / Ny SMS on Kampanjer; nothing on Mottakere). Phones get the create button above
 * the bottom menu instead.
 */
export function ChannelToolbar({ channel }: { channel: CampaignChannel }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <AreaSwitch
        label={`Bytt mellom kampanjer og mottakere på ${channel === 'SMS' ? 'SMS' : 'e-post'}`}
        pages={[
          { routeId: channelRouteId(channel, 'campaigns'), label: 'Kampanjer', icon: Megaphone },
          { routeId: channelRouteId(channel, 'recipients'), label: 'Mottakere', icon: Users },
        ]}
      />
      <div className="hidden flex-1 items-center lg:flex">
        <PageCreateButton className="h-11 px-4" />
      </div>
    </div>
  );
}
