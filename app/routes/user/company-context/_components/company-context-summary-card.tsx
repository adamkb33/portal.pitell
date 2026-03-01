import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, ChevronRight } from 'lucide-react';
import type { CompanySummaryDto } from '~/api/generated/base';

interface CompanyCardProps {
  company: CompanySummaryDto;
  onSubmit?: (values: { companyId: string }) => void;
}

export function CompanyContextSummaryCard({ company }: CompanyCardProps) {
  const { name, orgNumber, postalAddress } = company;

  const formatAddress = (address?: typeof company.postalAddress) => {
    if (!address) return 'N/A';
    const parts = [...(address.addressLines || []), address.postalCode, address.city].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Card variant="bordered">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold mb-1">{name}</CardTitle>
            <p className="text-sm text-card-text-muted truncate">{orgNumber}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-card-muted-bg text-card-text-muted">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 space-y-4">
        {postalAddress && (
          <div className="flex gap-2 min-w-0 rounded-md border border-card-border bg-card-muted-bg px-3 py-2">
            <MapPin className="h-4 w-4 text-card-text-muted shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed text-card-text line-clamp-2">{formatAddress(postalAddress)}</p>
          </div>
        )}

        <Button
          className="w-full justify-between bg-button-primary-bg text-button-primary-text hover:bg-button-primary-hover-bg hover:text-button-primary-hover-text"
          variant="default"
        >
          Logg inn
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
