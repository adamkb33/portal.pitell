import { Link } from 'react-router';
import { Briefcase, ChevronRight, FolderKanban, Settings } from 'lucide-react';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { cn, CompanyPageTemplate } from '~/ui';

const adminNavigation = [
  {
    id: 'services',
    label: 'Tjenester',
    description: 'Administrer tjenester, varighet og priser',
    href: ROUTES_MAP['company.booking.admin.services'].href,
    icon: Briefcase,
    iconClassName: 'bg-blue-50 text-interactive',
  },
  {
    id: 'service-groups',
    label: 'Tjenestegrupper',
    description: 'Organiser tjenestene dine i grupper',
    href: ROUTES_MAP['company.booking.admin.service-groups'].href,
    icon: FolderKanban,
    iconClassName: 'bg-success-soft text-success',
  },
  {
    id: 'settings',
    label: 'Innstillinger',
    description: 'Oppdater innstillinger for booking',
    href: ROUTES_MAP['company.booking.admin.settings'].href,
    icon: Settings,
    iconClassName: 'bg-surface-variant-1 text-text-secondary',
  },
];

export default function CompanyBookingAdminPage() {
  return (
    <CompanyPageTemplate title="Bookingadministrasjon" description="Velg hva du vil administrere.">
      <nav aria-label="Bookingadministrasjonssider" className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 sm:gap-5">
        {adminNavigation.map(({ id, href, label, description, icon: Icon, iconClassName }) => (
          <Link
            key={id}
            to={href}
            className="group relative flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-background p-5 pr-12 shadow-sm transition-[border-color,box-shadow] hover:border-interactive/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive sm:min-h-48 sm:flex-col sm:items-start sm:gap-5 sm:p-7"
          >
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', iconClassName)}>
              <Icon className="size-6" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 block text-base font-semibold tracking-tight sm:text-lg">{label}</span>
              <span className="block text-sm text-text-secondary">{description}</span>
            </span>
            <ChevronRight
              className="absolute right-5 top-1/2 size-4 -translate-y-1/2 text-text-disabled transition-colors group-hover:text-interactive sm:right-7 sm:top-7 sm:translate-y-0"
              aria-hidden
            />
          </Link>
        ))}
      </nav>
    </CompanyPageTemplate>
  );
}
