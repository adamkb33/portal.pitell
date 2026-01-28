import { data, redirect } from 'react-router';
import type { BrregEnhetResponse } from '~/api/brreg/types';

import { getAuthPayloadFromRequest } from '~/lib/auth.utils';
import { ROUTES_MAP } from '~/lib/route-tree';
import { CompanyUserController, type AddressDto } from '~/api/generated/identity';
import type { Route } from './+types/company.route';
import { Building2, Mail } from 'lucide-react';

export type CompanyIndexLoaderResponse = {
  brregResponse?: BrregEnhetResponse;
};

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuthPayloadFromRequest(request);

  if (!auth || !auth.companyId) {
    return redirect(ROUTES_MAP['user.company-context'].href);
  }

  const companSummaryResponse = await CompanyUserController.getCompanySummary();

  return data({
    companySummary: companSummaryResponse.data?.data,
  });
}

export default function CompanyIndex({ loaderData }: Route.ComponentProps) {
  const { companySummary } = loaderData;

  if (!companySummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-muted-foreground">
        <Building2 className="h-12 w-12 opacity-40" />
        <p className="text-base">Ingen firmainformasjon tilgjengelig</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Company header with icon */}
      <div className="flex items-start gap-3 md:gap-4 bg-card p-2 rounded-md">
        <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate">
            {companySummary.name || 'Ukjent firma'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5">Org.nr: {companySummary.orgNumber}</p>
        </div>
      </div>

      {/* Organization type badge */}
      {companySummary.organizationType?.description && (
        <div className="inline-flex items-center gap-2 self-start px-4 py-2 bg-secondary border border-secondary/20 rounded-full">
          <div className="h-2 w-2 rounded-full bg-secondary-foreground" />
          <span className="text-sm font-medium text-secondary-foreground">
            {companySummary.organizationType.description}
          </span>
        </div>
      )}

      {/* Address cards */}
      {(companySummary.businessAddress || companySummary.postalAddress) && (
        <div className="flex flex-col gap-3 md:gap-4">
          {companySummary.businessAddress && (
            <AddressCard
              icon={<Building2 className="h-5 w-5" />}
              title="Forretningsadresse"
              address={companySummary.businessAddress}
            />
          )}
          {companySummary.postalAddress && (
            <AddressCard
              icon={<Mail className="h-5 w-5" />}
              title="Postadresse"
              address={companySummary.postalAddress}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AddressCard({ icon, title, address }: { icon: React.ReactNode; title: string; address: AddressDto }) {
  return (
    <div className="group bg-card border border-card-border hover:border-card-hover-border rounded-xl p-4 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/50 text-accent-foreground group-hover:bg-accent transition-colors">
          {icon}
        </div>
        <p className="text-sm font-medium text-card-text">{title}</p>
      </div>
      <div className="text-sm md:text-base text-card-text space-y-0.5 pl-10">
        {address.addressLines?.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {address.postalCode && address.city && (
          <p className="font-medium">
            {address.postalCode} {address.city}
          </p>
        )}
        {address.country && <p className="text-card-text-muted">{address.country}</p>}
      </div>
    </div>
  );
}
