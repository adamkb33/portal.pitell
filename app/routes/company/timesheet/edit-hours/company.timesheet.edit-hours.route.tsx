import { data, Form, Link, useLoaderData, useNavigation } from 'react-router';
import type { Route } from './+types/company.timesheet.edit-hours.route';
import { CompanyUserTimesheetEntryController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { Button, CompanyPageTemplate, Input, Label, Notice, Panel, Textarea } from '~/ui';
import {
  formatDateInputToZonedISOString,
  normalizeNote,
  parsePositiveFloat,
  parseTimesheetId,
  toHoursEditEntryState,
} from '../_utils';

export async function loader({ request, params }: Route.LoaderArgs) {
  const id = parseTimesheetId(params.id);
  if (id == null) {
    throw new Response('Ugyldig timeliste-ID', { status: 400 });
  }

  try {
    const response = await withAuth(request, () =>
      CompanyUserTimesheetEntryController.getEntryById({
        path: { id },
      }),
    );

    const entry = response.data?.data;
    if (!entry) {
      throw new Response('Fant ikke timelisten', { status: 404 });
    }

    if (entry.entryMode !== 'HOURS') {
      throw new Response('Timelisten er ikke en timer-registrering', { status: 400 });
    }

    return {
      id,
      entry: toHoursEditEntryState(entry),
      declineReason: entry.declineReason ?? null,
    };
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente timelisten');
    throw new Response(message, { status: status ?? 400 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = parseTimesheetId(params.id);
  if (id == null) {
    const errorMessage = 'Ugyldig timeliste-ID';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  const formData = await request.formData();
  const date = String(formData.get('date') ?? '');
  const hours = parsePositiveFloat(formData.get('hours'));
  const note = normalizeNote(formData.get('note'));

  if (!date || Number.isNaN(hours) || hours <= 0) {
    const errorMessage = 'Dato og gyldig antall timer må fylles ut.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () =>
      CompanyUserTimesheetEntryController.updateHoursEntry({
        path: { id },
        body: {
          date: formatDateInputToZonedISOString(date),
          hours,
          note,
        },
      }),
    );

    return redirectWithSuccess(request, ROUTES_MAP['company.timesheet'].href, 'Timelisten ble oppdatert');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke oppdatere timer');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyTimesheetEditHours() {
  const { id, entry, declineReason } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <CompanyPageTemplate
      title={`Rediger timer #${id}`}
      description="Oppdater timer med samme kompakte formulamønster som resten av company-domenet."
      label="Timelister"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES_MAP['company.timesheet'].href}>Tilbake</Link>
        </Button>
      }
    >
      <Panel title="Oppdater registrering" description="Dato, timer og notat for valgt registrering.">
        <Form method="post" className="space-y-4">
          {declineReason ? <Notice tone="emphasis" title="Registreringen ble avvist" message={declineReason} /> : null}

          <div className="space-y-2">
            <Label htmlFor="date">Dato</Label>
            <Input type="date" id="date" name="date" defaultValue={entry.date} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Antall timer</Label>
            <Input type="number" id="hours" name="hours" step="0.25" min="0.25" defaultValue={entry.hours} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notat (valgfritt)</Label>
            <Textarea id="note" name="note" rows={4} placeholder="Oppdater kommentar" defaultValue={entry.note} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Oppdaterer...' : 'Oppdater timer'}
          </Button>
        </Form>
      </Panel>
    </CompanyPageTemplate>
  );
}
