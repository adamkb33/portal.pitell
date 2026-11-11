import { Link } from 'react-router';
import { BarChart3, ChevronRight, Contact, Shield, Users } from 'lucide-react';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { cn, CompanyPageTemplate } from '~/ui';

export default function CompanyAdminRoute() {
  const sectionNavigation = (
    <nav aria-label="Administrasjonssider" className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 sm:gap-5">
      {[
        {
          id: 'company.admin.employees',
          label: 'Ansatte',
          description: 'Administrer ansatte og invitasjoner',
          icon: Users,
          iconClassName: 'bg-blue-50 text-interactive',
        },
        {
          id: 'company.admin.contacts',
          label: 'Kontakter',
          description: 'Se og oppdater kundekontakter',
          icon: Contact,
          iconClassName: 'bg-success-soft text-success',
        },
        {
          id: 'company.admin.settings',
          label: 'Innstillinger',
          description: 'Selskapsinformasjon og innstillinger',
          icon: Shield,
          iconClassName: 'bg-surface-variant-1 text-text-secondary',
        },
        {
          id: 'company.admin.statistics',
          label: 'Statistikk',
          description: 'Brukere, invitasjoner og kontaktinnsikt',
          icon: BarChart3,
          iconClassName: 'bg-purple-soft text-purple',
        },
      ].map(({ id, label, description, icon: Icon, iconClassName }) => (
        <Link
          key={id}
          to={ROUTES_MAP[id].href}
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
  );

  return (
    <CompanyPageTemplate title="Administrasjon" description="Velg hva du vil administrere.">
      {sectionNavigation}
    </CompanyPageTemplate>
  );
}
