import { Mail, Megaphone, MessageSquare, Users } from 'lucide-react';
import type { Route } from './+types/company.marketing.route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { OverviewRow } from '~/routes/company/_components/overview-rows';
import { KeyDestinationCard } from '~/routes/company/booking/_components/key-destination-card';
import { CompanyPageTemplate } from '~/ui';
import { loader as requireMarketingAdmin } from './company.marketing.layout';
import { pluralize } from './_utils/campaigns';
import { countCampaignsThisMonth, countRecipients } from './_utils/counts.server';
import { CHANNEL_PARAM, channelSlug } from './_utils/recipients';

export async function loader({ request }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });

  const [campaignsThisMonth, recipients, email, sms] = await Promise.all([
    countCampaignsThisMonth(request),
    countRecipients(request, null),
    countRecipients(request, 'EMAIL'),
    countRecipients(request, 'SMS'),
  ]);
  return { campaignsThisMonth, recipients, email, sms };
}

/**
 * Markedsføring's Oversikt (ui-rules → Page types, Oversikt; approved domain sketch 2026-11-18). The key
 * destinations, Kampanjer and Mottakere, as full-colour cards with one live number each; below them one row per
 * channel, since every customer says yes to e-post and SMS separately. Nothing to create here: "Ny kampanje" is
 * the Kampanjer list's create action.
 */
export default function CompanyMarketingRoute({ loaderData }: Route.ComponentProps) {
  const { campaignsThisMonth, recipients, email, sms } = loaderData;
  const recipientsHref = ROUTES_MAP['company.marketing.recipients'].href;
  const channelLine = (count: number | null, fallback: string) =>
    count === null ? fallback : pluralize(count, 'mottaker', 'mottakere');

  return (
    <CompanyPageTemplate title="Markedsføring">
      <nav aria-label="Markedsføring" className="flex max-w-140 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <KeyDestinationCard
            href={ROUTES_MAP['company.marketing.campaigns'].href}
            label="Kampanjer"
            icon={Megaphone}
            tone="pink"
            count={campaignsThisMonth}
            countLabel="denne måneden"
          />
          <KeyDestinationCard
            href={recipientsHref}
            label="Mottakere"
            icon={Users}
            tone="fuchsia"
            count={recipients}
            countLabel={recipients === 1 ? 'kunde' : 'kunder'}
          />
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          <li>
            <OverviewRow
              to={`${recipientsHref}?${CHANNEL_PARAM}=${channelSlug('EMAIL')}`}
              icon={Mail}
              tone="bg-marketing-email-soft text-marketing-email"
              title="E-post"
              line={channelLine(email, 'Kunder som vil ha e-post')}
            />
          </li>
          <li>
            <OverviewRow
              to={`${recipientsHref}?${CHANNEL_PARAM}=${channelSlug('SMS')}`}
              icon={MessageSquare}
              tone="bg-marketing-sms-soft text-marketing-sms"
              title="SMS"
              line={channelLine(sms, 'Kunder som vil ha SMS')}
            />
          </li>
        </ul>
      </nav>
    </CompanyPageTemplate>
  );
}
