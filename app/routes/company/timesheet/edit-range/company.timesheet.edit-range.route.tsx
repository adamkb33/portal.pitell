import { useState } from 'react';
import { data, Form, Link, useLoaderData, useNavigation } from 'react-router';
import type { Route } from './+types/company.timesheet.edit-range.route';
import { CompanyUserTimesheetEntryController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { Button, CompanyPageTemplate, Input, Label, Notice, Panel, Textarea } from '~/ui';
import { StartEndTimeSelector } from '~/components/pickers/start-end-time-selector';
import {
  formatDateInputToZonedISOString,
  normalizeNote,
  parseNonNegativeInteger,
  parseTimesheetId,
  toRangeEditEntryState,
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

    if (entry.entryMode !== 'RANGE') {
      throw new Response('Timelisten er ikke et tidsintervall', { status: 400 });
    }

    return {
      id,
      entry: toRangeEditEntryState(entry),
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
  const fromTime = String(formData.get('fromTime') ?? '');
  const toTime = String(formData.get('toTime') ?? '');
  const breakMinutes = parseNonNegativeInteger(formData.get('breakMinutes'));
  const note = normalizeNote(formData.get('note'));

  if (!date || !fromTime || !toTime) {
    const errorMessage = 'Dato og tidspunkt må fylles ut.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  if (Number.isNaN(breakMinutes) || breakMinutes < 0) {
    const errorMessage = 'Pause må være et gyldig tall.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () =>
      CompanyUserTimesheetEntryController.updateRangeEntry({
        path: { id },
        body: {
          date: formatDateInputToZonedISOString(date),
          fromTime,
          toTime,
          note,
        },
      }),
    );

    return redirectWithSuccess(request, ROUTES_MAP['company.timesheet'].href, 'Timelisten ble oppdatert');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke oppdatere timelisten');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyTimesheetEditRange() {
  const { id, entry, declineReason } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [fromTime, setFromTime] = useState(entry.fromTime);
  const [toTime, setToTime] = useState(entry.toTime);

  return (
    <CompanyPageTemplate
      title={`Rediger tidsintervall #${id}`}
      description="Oppdater tidsintervaller med samme kompakte formulamønster som resten av company-domenet."
      label="Timelister"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES_MAP['company.timesheet'].href}>Tilbake</Link>
        </Button>
      }
    >
      <Panel title="Oppdater registrering" description="Dato, pause og intervall for valgt registrering.">
        <Form method="post" className="space-y-4">
          {declineReason ? <Notice tone="emphasis" title="Registreringen ble avvist" message={declineReason} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Dato</Label>
              <Input type="date" id="date" name="date" defaultValue={entry.date} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakMinutes">Pause (minutter)</Label>
              <Input type="number" id="breakMinutes" name="breakMinutes" min={0} defaultValue={entry.breakMinutes} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <StartEndTimeSelector
                startValue={fromTime}
                endValue={toTime}
                onStartChange={setFromTime}
                onEndChange={setToTime}
                startPlaceholder="Velg start"
                endPlaceholder="Velg slutt"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notat (valgfritt)</Label>
            <Textarea
              id="note"
              name="note"
              rows={4}
              placeholder="Oppdater eventuell kommentar"
              defaultValue={entry.note}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Oppdaterer...' : 'Oppdater tidsintervall'}
          </Button>
        </Form>
      </Panel>
    </CompanyPageTemplate>
  );
}
