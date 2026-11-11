import { useState } from 'react';
import { data, Form, useNavigation } from 'react-router';
import { Check, Gift } from 'lucide-react';
import type { Route } from './+types/company.booking.admin.loyalty.route';
import { Booking } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHead,
  Checkbox,
  CompanyPageTemplate,
  FormField,
  Label,
  Text,
} from '~/ui';

const DEFAULT_LOYALTY = { visitsRequired: 5, enabled: false };
const EXAMPLE_STAMPS = 3;
const MAX_PREVIEW_STAMPS = 10;

export async function loader({ request }: Route.LoaderArgs) {
  await requireBookingAdmin({ request });

  try {
    const response = await withAuth(request, () => Booking.getLoyaltyRule());
    return data({ loyalty: response.data?.data ?? DEFAULT_LOYALTY, error: null as string | null });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente lojalitetsprogram');
    return data({ loyalty: DEFAULT_LOYALTY, error: message });
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });

  const formData = await request.formData();
  const visitsRequired = Number(formData.get('visitsRequired'));
  const enabled = formData.get('enabled') === 'on';
  const values = { visitsRequired: String(formData.get('visitsRequired') ?? ''), enabled };

  if (!Number.isInteger(visitsRequired) || visitsRequired < 1 || visitsRequired > 100) {
    const error = 'Antall besøk må være et helt tall mellom 1 og 100.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () => Booking.saveLoyaltyRule({ body: { visitsRequired, enabled } }));
    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.admin.loyalty'].href,
      'Lojalitetsprogrammet er lagret.',
    );
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre lojalitetsprogram');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyBookingAdminLoyaltyPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [visitsRequired, setVisitsRequired] = useState(
    actionData?.values.visitsRequired ?? String(loaderData.loyalty.visitsRequired),
  );
  const [enabled, setEnabled] = useState(actionData?.values.enabled ?? loaderData.loyalty.enabled);

  const count = Number(visitsRequired);
  const isValid = Number.isInteger(count) && count >= 1 && count <= 100;
  const error = actionData?.error ?? loaderData.error ?? undefined;

  return (
    <CompanyPageTemplate
      title="Lojalitetsprogram"
      actions={<Badge variant={enabled ? 'success' : 'muted'}>{enabled ? 'Aktiv' : 'Av'}</Badge>}
    >
      <Card variant="default">
        <CardHead heading="Slik ser kunden det">
          <Text as="p" variant="body-sm" className="mt-1 text-text-secondary">
            {isValid && count > 1
              ? `Besøk 1 til ${count - 1} betaler kunden som vanlig. Besøk ${count} er gratis, og så starter kortet på nytt. `
              : ''}
            Gratisbesøket teller som et vanlig besøk og settes automatisk på kundens bestilling. Bare besøk etter at
            programmet ble aktivert teller. Avbestilte timer og uteblivelser teller ikke.
          </Text>
        </CardHead>
        <CardContent>
          {isValid ? (
            <>
              <Text as="p" variant="body" className="font-medium">
                {count === 1 ? 'Hvert besøk er gratis' : `Hvert ${count}. besøk er gratis`}
              </Text>
              <div className="mt-3 flex flex-wrap items-center gap-2" aria-hidden>
                {Array.from({ length: Math.min(count, MAX_PREVIEW_STAMPS) }, (_, index) => {
                  const position = index + 1;
                  const isReward = position === count;
                  const isStamped = position <= EXAMPLE_STAMPS && !isReward;
                  return (
                    <span
                      key={position}
                      className={`flex size-7 items-center justify-center rounded-full border text-xs ${
                        isReward
                          ? 'border-success bg-success-soft text-success'
                          : isStamped
                            ? 'border-interactive bg-blue-50 text-interactive'
                            : 'border-border text-text-secondary'
                      }`}
                    >
                      {isReward ? <Gift className="size-3.5" /> : isStamped ? <Check className="size-3.5" /> : position}
                    </span>
                  );
                })}
                {count > MAX_PREVIEW_STAMPS ? <span className="text-sm text-text-secondary">… {count}</span> : null}
              </div>
              <Text as="p" variant="caption" className="mt-3 text-text-secondary">
                Eksempel: kunde som har tatt {Math.min(EXAMPLE_STAMPS, count - 1)} timer
              </Text>
            </>
          ) : (
            <Text as="p" variant="body-sm" className="text-text-secondary">
              Skriv inn et antall besøk for å se forhåndsvisning.
            </Text>
          )}
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHead heading="Innstillinger" />
        <CardContent>
          <Form method="post" className="space-y-4">
            <FormField
              label="Hvilket besøk er gratis? (hvert ...)"
              name="visitsRequired"
              type="number"
              min={1}
              max={100}
              value={visitsRequired}
              onChange={(event) => setVisitsRequired(event.target.value)}
              error={error}
              helperText="Eksempel: 5 betyr at hvert 5. besøk er gratis. Endringen gjelder alle kunder, og besøk de allerede har hatt teller fortsatt."
            />
            <div className="flex items-center gap-2">
              <Checkbox id="loyalty-enabled" name="enabled" checked={enabled} onCheckedChange={setEnabled} />
              <Label htmlFor="loyalty-enabled">Lojalitetsprogrammet er aktivt</Label>
            </div>
            <Button type="submit" loading={isSubmitting}>
              Lagre
            </Button>
          </Form>
        </CardContent>
      </Card>
    </CompanyPageTemplate>
  );
}
