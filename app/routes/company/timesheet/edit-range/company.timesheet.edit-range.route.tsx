import { useState } from 'react';
import { Form, useActionData, useNavigation, useLoaderData } from 'react-router';
import { data } from 'react-router';
import type { Route } from './+types/company.timesheet.edit-range.route';
import { CompanyUserTimesheetEntryController } from '~/api/generated/timesheet';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/routes/company/_lib/flash-message.server';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Input } from '~/components/ui/input';
import { TimePicker } from '~/components/pickers/time-picker';
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
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [fromTime, setFromTime] = useState(entry.fromTime);
  const [toTime, setToTime] = useState(entry.toTime);
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rediger tidsintervall #{id}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {declineReason && (
              <Alert variant="destructive">
                <AlertTitle>Registreringen ble avvist</AlertTitle>
                <AlertDescription>{declineReason}</AlertDescription>
              </Alert>
            )}

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
                <Label>Fra kl.</Label>
                <input type="hidden" name="fromTime" value={fromTime} />
                <TimePicker
                  value={fromTime}
                  placeholder="Velg start"
                  isOpen={activePicker === 'from'}
                  onOpenChange={(open) => setActivePicker(open ? 'from' : null)}
                  onChange={(next) => {
                    setFromTime(next);
                    setActivePicker(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Til kl.</Label>
                <input type="hidden" name="toTime" value={toTime} />
                <TimePicker
                  value={toTime}
                  placeholder="Velg slutt"
                  isOpen={activePicker === 'to'}
                  onOpenChange={(open) => setActivePicker(open ? 'to' : null)}
                  onChange={(next) => {
                    setToTime(next);
                    setActivePicker(null);
                  }}
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

            {actionData?.error && (
              <Alert variant="destructive">
                <AlertTitle>Kunne ikke oppdatere</AlertTitle>
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Oppdaterer...' : 'Oppdater tidsintervall'}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
