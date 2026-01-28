import * as React from 'react';
import { data, Link, useNavigation, useSubmit } from 'react-router';
import type { Route } from './+types/company.timesheet.register.route';
import { CompanyUserTimesheetEntryController } from '~/api/generated/timesheet';
import { withAuth } from '~/api/utils/with-auth';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { DatePicker } from '~/components/pickers/date-picker';
import { TimePicker } from '~/components/pickers/time-picker';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithSuccess, setFlashMessage } from '~/routes/company/_lib/flash-message.server';
import { formatDateInputToZonedISOString, normalizeNote, parseBulkEntries, splitBulkEntries } from '../_utils';

type EntryMode = 'hours' | 'range';

type RegisterEntry = {
  id: string;
  mode: EntryMode;
  date: string;
  hours: string;
  fromTime: string;
  toTime: string;
};

type RegisterFormData = {
  mode: EntryMode;
  note: string;
  entries: RegisterEntry[];
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const note = normalizeNote(formData.get('note'));
  const { error, entries } = parseBulkEntries(formData.get('entries'));

  if (error) {
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ ok: false, error }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  const { rangeEntries, hoursEntries } = splitBulkEntries(entries);
  if (!rangeEntries.length && !hoursEntries.length) {
    const errorMessage = 'Legg til minst én gyldig registrering før du lagrer.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ ok: false, error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    if (rangeEntries.length) {
      await withAuth(request, () =>
        CompanyUserTimesheetEntryController.createRangeEntries({
          body: {
            note,
            days: rangeEntries.map((entry) => ({
              date: formatDateInputToZonedISOString(entry.date),
              fromTime: entry.fromTime!,
              toTime: entry.toTime!,
            })),
          },
        }),
      );
    }

    if (hoursEntries.length) {
      await withAuth(request, () =>
        CompanyUserTimesheetEntryController.createHoursEntries({
          body: {
            note,
            days: hoursEntries.map((entry) => ({
              date: formatDateInputToZonedISOString(entry.date),
              hours: Number(entry.hours),
            })),
          },
        }),
      );
    }

    return redirectWithSuccess(request, ROUTES_MAP['company.timesheet'].href, 'Registrering lagret');
  } catch (err) {
    const { message } = resolveErrorPayload(err, 'Kunne ikke lagre registreringene');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ ok: false, error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyTimeSheetsRegisterRoute({ actionData }: Route.ComponentProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [form, setForm] = React.useState<RegisterFormData>({
    mode: 'hours',
    note: '',
    entries: [createEntry('hours')],
  });

  const updateEntry = (id: string, patch: Partial<RegisterEntry>) => {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));
  };

  const removeEntry = (id: string) => {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((entry) => entry.id !== id),
    }));
  };

  const addEntry = (mode: EntryMode) => {
    setForm((prev) => ({
      ...prev,
      entries: [...prev.entries, createEntry(mode)],
    }));
  };

  const visibleEntries = form.entries.filter((entry) => entry.mode === form.mode);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Ny registrering</h1>
          <p className="text-sm text-muted-foreground">Opprett timer eller tidsintervaller og send dem inn.</p>
        </div>
        <Button asChild variant="outline">
          <Link to={ROUTES_MAP['company.timesheet'].href}>Avbryt</Link>
        </Button>
      </div>

      {actionData?.ok === false && actionData.error ? (
        <Alert variant="destructive">
          <AlertTitle>Kunne ikke lagre registreringen</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData();
          formData.append('note', form.note);
          formData.append('entries', JSON.stringify(toBulkEntries(form.entries)));
          submit(formData, { method: 'post' });
        }}
        className="rounded-lg border border-border bg-card"
      >
        <div className="space-y-6 p-4 sm:p-6">
          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">Registreringstype</h2>
            </div>
            <Tabs
              value={form.mode}
              onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value as RegisterFormData['mode'] }))}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger value="hours" className="w-full">
                  Timer
                </TabsTrigger>
                <TabsTrigger value="range" className="w-full">
                  Interval
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-medium text-foreground">Notat</h2>
            </div>
            <Textarea
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Valgfritt"
              className="min-h-24 bg-form-bg border-form-border text-form-text"
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-medium text-foreground">Registreringer</h2>
              </div>
              <Button type="button" variant="secondary" onClick={() => addEntry(form.mode)}>
                Legg til registrering
              </Button>
            </div>

            <div className="space-y-3">
              {visibleEntries.map((entry) => (
                <div key={entry.id} className="flex flex-wrap gap-2 rounded-md border border-border p-3">
                  <div className="flex-1 min-w-[220px]">
                    <DatePicker
                      selectedDate={entry.date}
                      onChange={(isoDate) => updateEntry(entry.id, { date: isoDate })}
                      isDateAllowed={isDateWithinOneMonth}
                      minDate={getMinSelectableDate()}
                      maxDate={getMaxSelectableDate()}
                    />
                  </div>
                  <div className="flex-1 min-w-[220px] flex items-center">
                    {entry.mode === 'hours' ? (
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Timer"
                        value={entry.hours}
                        onChange={(event) => updateEntry(entry.id, { hours: event.target.value })}
                        className="bg-form-bg border-form-border text-form-text"
                      />
                    ) : (
                      <RangeTimeInputs
                        entryId={entry.id}
                        fromTime={entry.fromTime}
                        toTime={entry.toTime}
                        onChange={updateEntry}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    <Button type="button" variant="outline" onClick={() => removeEntry(entry.id)}>
                      Fjern
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" asChild>
            <Link to={ROUTES_MAP['company.timesheet'].href}>Avbryt</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Lagrer...' : 'Lagre'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function createEntry(mode: EntryMode): RegisterEntry {
  return {
    id: createEntryId(),
    mode,
    date: formatDateForInput(new Date()),
    hours: '',
    fromTime: '',
    toTime: '',
  };
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toBulkEntries(entries: RegisterEntry[]) {
  return entries.map((entry) => ({
    date: entry.date,
    entryMode: entry.mode === 'hours' ? 'HOURS' : 'RANGE',
    hours: entry.hours ? Number(entry.hours) : undefined,
    fromTime: entry.fromTime || undefined,
    toTime: entry.toTime || undefined,
  }));
}

type RangeTimeInputsProps = {
  entryId: string;
  fromTime: string;
  toTime: string;
  onChange: (id: string, patch: Partial<RegisterEntry>) => void;
};

function RangeTimeInputs({ entryId, fromTime, toTime, onChange }: RangeTimeInputsProps) {
  const [activePicker, setActivePicker] = React.useState<'from' | 'to' | null>(null);

  return (
    <div className="flex w-full gap-2">
      <div className="flex-1">
        <TimePicker
          value={fromTime}
          placeholder="Fra"
          isOpen={activePicker === 'from'}
          onOpenChange={(open) => setActivePicker(open ? 'from' : null)}
          onChange={(next) => {
            onChange(entryId, { fromTime: next });
            setActivePicker(null);
          }}
          zIndex={80}
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <TimePicker
          value={toTime}
          placeholder="Til"
          isOpen={activePicker === 'to'}
          onOpenChange={(open) => setActivePicker(open ? 'to' : null)}
          onChange={(next) => {
            onChange(entryId, { toTime: next });
            setActivePicker(null);
          }}
          zIndex={80}
          className="w-full"
        />
      </div>
    </div>
  );
}

function isDateWithinOneMonth(date: Date) {
  const min = getMinSelectableDate();
  const max = getMaxSelectableDate();
  return date >= startOfDay(min) && date <= endOfDay(max);
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function getMinSelectableDate() {
  const now = new Date();
  const min = new Date(now);
  min.setMonth(min.getMonth() - 1);
  return min;
}

function getMaxSelectableDate() {
  const now = new Date();
  const max = new Date(now);
  max.setMonth(max.getMonth() + 1);
  return max;
}
