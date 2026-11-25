import { NavLink } from 'react-router';
import { Settings2, SlidersHorizontal } from 'lucide-react';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, Card, CardContent, CardHead, CompanyPageTemplate, KpiCard, Text } from '~/ui';

export default function CompanyBookingAdminSettingsPage() {
  return (
    <CompanyPageTemplate
      title="Bookinginnstillinger"
      description="Samle generelle bookingvalg i samme kompakte sideoppsett som resten av booking-domenet."
      routeLinks={
        <>
          <Button asChild variant="outline" size="sm">
            <NavLink to={ROUTES_MAP['company.booking'].href}>Oversikt</NavLink>
          </Button>
          <Button asChild variant="outline" size="sm">
            <NavLink to={ROUTES_MAP['company.booking.admin'].href}>Administrasjon</NavLink>
          </Button>
        </>
      }
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SettingsMetricCard
            label="Status"
            value="Klar"
            description="Siden er flyttet inn i templatesystemet og bruker bookingens designrytme."
            icon={<Settings2 className="h-5 w-5 text-primary" />}
          />
          <SettingsMetricCard
            label="Neste steg"
            value="Konfigurasjon"
            description="Legg kommende innstillingsfelt her uten å bryte designet mellom booking-sidene."
            icon={<SlidersHorizontal className="h-5 w-5 text-secondary" />}
            accent="success"
          />
        </div>
      }
    >
      <Card variant="default">
        <CardHead heading="Generelle innstillinger">
          <Text as="p" variant="body-sm" className="mt-1 text-text-secondary">
            Denne siden er klar for videre konfigurasjon med samme komponentbibliotek.
          </Text>
        </CardHead>
        <CardContent>
          <Text as="p" variant="body-sm" className="text-text-secondary">
            Bruk kort, seksjoner og eventuelle fremtidige skjemaer fra `~/ui` slik at innstillingssiden følger samme
            kompakte struktur som bookingoversikt, bookingprofil og timebestillinger.
          </Text>
        </CardContent>
      </Card>
    </CompanyPageTemplate>
  );
}

function SettingsMetricCard({
  label,
  value,
  description,
  icon,
  accent = 'info',
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  accent?: 'info' | 'success';
}) {
  return <KpiCard label={label} value={value} icon={icon} compare={description} tone={accent} />;
}
