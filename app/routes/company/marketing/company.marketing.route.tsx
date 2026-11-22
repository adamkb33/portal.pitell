import { Mail, MessageSquare } from 'lucide-react';
import type { Route } from './+types/company.marketing.route';
import { KeyDestinationCard } from '~/routes/company/booking/_components/key-destination-card';
import { CompanyPageTemplate } from '~/ui';
import { loader as requireMarketingAdmin } from './company.marketing.layout';
import { channelHref } from './_utils/channels';
import { countRecipients } from './_utils/counts.server';

export async function loader({ request }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });

  const [email, sms] = await Promise.all([countRecipients(request, 'EMAIL'), countRecipients(request, 'SMS')]);
  return { email, sms };
}

/**
 * Markedsføring's Oversikt (ui-rules → Page types, Oversikt; approved 2026-11-19). Customers say yes to e-post and
 * SMS separately and each channel has its own pages, so the key destinations are the two channels, in their channel
 * colours, with how many customers each reaches. Nothing to create here: Ny e-post / Ny SMS live on each channel's
 * Kampanjer page.
 */
export default function CompanyMarketingRoute({ loaderData }: Route.ComponentProps) {
  const { email, sms } = loaderData;
  const countLabel = (count: number | null) => (count === 1 ? 'mottaker' : 'mottakere');

  return (
    <CompanyPageTemplate title="Markedsføring">
      <nav aria-label="Markedsføring" className="grid max-w-140 grid-cols-2 gap-3">
        <KeyDestinationCard
          href={channelHref('EMAIL', 'campaigns')}
          label="E-post"
          icon={Mail}
          tone="blue"
          count={email}
          countLabel={countLabel(email)}
        />
        <KeyDestinationCard
          href={channelHref('SMS', 'campaigns')}
          label="SMS"
          icon={MessageSquare}
          tone="plum"
          count={sms}
          countLabel={countLabel(sms)}
        />
      </nav>
    </CompanyPageTemplate>
  );
}
