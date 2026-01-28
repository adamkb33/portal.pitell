import { Link } from 'react-router';
import { FolderKanban, Briefcase } from 'lucide-react';
import { PageHeader } from '../../_components/page-header';
import { ROUTES_MAP } from '~/lib/route-tree';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';

const adminNavigation = [
  {
    id: 'service-groups',
    title: 'Tjenestegrupper',
    description: 'Organiser tjenester i grupper for enklere administrasjon.',
    href: ROUTES_MAP['company.booking.admin.service-groups'].href,
    icon: FolderKanban,
  },
  {
    id: 'services',
    title: 'Tjenester',
    description: 'Opprett og vedlikehold tjenester, varighet og priser.',
    href: ROUTES_MAP['company.booking.admin.service-groups.services'].href,
    icon: Briefcase,
  },
];

export default function CompanyBookingAdminPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <PageHeader
        title="Booking Administrasjon"
        description="Administrer booking-innstillinger, tjenester og avtaler. Styr alle aspekter av bookingsystemet ditt."
        teaser="Velg en seksjon for å konfigurere bookingoppsett og katalog."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} to={item.href} className="group">
              <Card variant="interactive" size="md" className="h-full">
                <CardHeader className="border-b">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Gå til {item.title.toLowerCase()}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
