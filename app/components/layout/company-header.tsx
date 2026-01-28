import { Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { cn } from '@/lib/utils';
import type { CompanySummaryDto } from '~/api/generated/identity';

type CompanyHeaderProps = {
  company?: CompanySummaryDto | null;
  canAccessCompanyContext?: boolean;
  className?: string;
};

export default function CompanyHeader({ company, canAccessCompanyContext = true, className }: CompanyHeaderProps) {
  if (company === null) {
    return null;
  }

  if (company === undefined) {
    if (!canAccessCompanyContext) {
      return null;
    }

    return (
      <Link
        to={ROUTES_MAP['user.company-context'].href}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 border-l-2 border-navbar-border',
          'hover:border-primary hover:bg-navbar-accent transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-navbar-ring focus:ring-inset',
          className,
        )}
      >
        <div className="hidden md:flex h-10 w-10 items-center justify-center rounded bg-navbar-icon-bg shrink-0 transition-colors duration-200 group-hover:bg-navbar-accent">
          <Building2 className="h-5 w-5 text-primary" />
        </div>

        <span className="text-sm font-medium text-navbar-text group-hover:text-primary transition-colors duration-200">
          Logg inn i ditt selskap
        </span>

        <ChevronRight className="h-4 w-4 text-navbar-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </Link>
    );
  }

  return (
    <Link
      to={ROUTES_MAP['company'].href}
      className={cn(
        'group flex items-center gap-3 px-4 py-3 border-l-2 border-navbar-border',
        'hover:border-primary hover:bg-navbar-accent transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-navbar-ring focus:ring-inset',
        className,
      )}
    >
      <div className="md:hidden flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary font-bold text-base shrink-0 uppercase transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-105">
        {company.name?.charAt(0) || 'B'}
      </div>

      <div className="hidden md:flex h-10 w-10 items-center justify-center rounded bg-navbar-icon-bg shrink-0 transition-all duration-200 group-hover:bg-navbar-accent group-hover:scale-105">
        <Building2 className="h-5 w-5 text-primary" />
      </div>

      <div className="hidden md:flex flex-col min-w-0 gap-0.5">
        <div className="text-sm font-semibold text-navbar-text truncate group-hover:text-primary transition-colors duration-200">
          {company.name}
        </div>

        <div className="text-xs font-medium text-navbar-text-muted">Org. {company.orgNumber}</div>
      </div>

      <ChevronRight className="hidden md:block h-4 w-4 text-navbar-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
