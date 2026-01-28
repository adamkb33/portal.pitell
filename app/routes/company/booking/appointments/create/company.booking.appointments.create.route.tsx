import { ROUTES_MAP } from '~/lib/route-tree';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Link, useLocation } from 'react-router';

const EXISTING_USER_PATH = `${ROUTES_MAP['company.booking.appointments.create'].href}/existing-user`;
const NEW_USER_PATH = `${ROUTES_MAP['company.booking.appointments.create'].href}/new-user`;

export default function CompanyBookingAppointmentsCreatePage() {
  const location = useLocation();
  const searchSuffix = location.search || '';

  return (
    <div className="max-w-xl">
      <Card className="p-4 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Opprett ny time</h1>
          <p className="text-sm text-muted-foreground">Velg hvordan du vil opprette avtalen.</p>
        </div>
        <div className="grid gap-2">
          <Button asChild>
            <Link to={`${EXISTING_USER_PATH}${searchSuffix}`}>Eksisterende kunde</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`${NEW_USER_PATH}${searchSuffix}`}>Ny kunde</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={ROUTES_MAP['company.booking.appointments'].href}>Avbryt</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
