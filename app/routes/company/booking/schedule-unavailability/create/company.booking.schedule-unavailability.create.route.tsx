import type { FormPageHandle } from '~/lib/routing/create-action';
import { data, redirect } from 'react-router';
import type { Route } from './+types/company.booking.schedule-unavailability.create.route';
import { useState } from 'react';
import { useNavigation, useSubmit } from 'react-router';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { CompanyUserScheduleUnavailabilityController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { DateField } from '~/components/pickers/date-field';
import { TimePicker } from '~/components/pickers/time-picker';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { formatLocalDateTimeInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyFormPageTemplate, Label, Switch } from '~/ui';
import { absenceSummary, defaultAbsenceDraft, withStartDay, type AbsenceDraft } from '../_utils/absence-draft';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

function resolveRedirectTo(value: string | null): string {
  if (!value) return ROUTES_MAP['company.booking.schedule-unavailability'].href;
  if (!value.startsWith('/')) return ROUTES_MAP['company.booking.schedule-unavailability'].href;
  return value;
}

/** "Legg til fravær" from a gap in Kalender opens with that time filled in (`?from=…&to=…`). */
function parsePrefill(searchParams: URLSearchParams): AbsenceDraft | null {
  const from = new Date(searchParams.get('from') ?? '');
  const to = new Date(searchParams.get('to') ?? '');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return null;
  return {
    wholeDay: false,
    startDay: format(from, 'yyyy-MM-dd'),
    startTime: format(from, 'HH:mm'),
    endDay: format(to, 'yyyy-MM-dd'),
    endTime: format(to, 'HH:mm'),
  };
}

function isPastPrefillRange(searchParams: URLSearchParams): boolean {
  const to = searchParams.get('to');
  if (!to) return false;
  const toDate = new Date(to);
  if (Number.isNaN(toDate.getTime())) return false;
  return toDate.getTime() < Date.now();
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = resolveRedirectTo(url.searchParams.get('redirectTo'));
  if (isPastPrefillRange(url.searchParams)) {
    const flashCookie = await setFlashMessage(request, { type: 'error', text: 'Tidligere fravær kan ikke redigeres' });
    return redirect(redirectTo, { headers: { 'Set-Cookie': flashCookie } });
  }

  return data({
    prefill: parsePrefill(url.searchParams),
    redirectTo,
  });
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const url = new URL(request.url);
    const redirectTo = resolveRedirectTo(url.searchParams.get('redirectTo'));
    const formData = await request.formData();
    const rangesRaw = String(formData.get('ranges') ?? '[]');
    const ranges = JSON.parse(rangesRaw) as Array<{
      fromDate: string;
      toDate: string;
      startTime: string;
      endTime: string;
    }>;

    if (!Array.isArray(ranges) || ranges.length === 0) {
      const error = 'Legg til minst én periode';
      const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
      return data({ error }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }

    const normalizeTime = (value: string) => (value.split(':').length === 2 ? `${value}:00` : value);
    const timezone = 'Europe/Oslo';
    const payload = ranges.map((range) => {
      const fromDate = fromZonedTime(`${range.fromDate}T${normalizeTime(range.startTime)}`, timezone);
      const toDate = fromZonedTime(`${range.toDate}T${normalizeTime(range.endTime)}`, timezone);

      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate >= toDate) {
        throw new Error('Ugyldig dato eller tid');
      }

      return {
        from: formatLocalDateTimeInTimeZone(range.fromDate, range.startTime, timezone),
        to: formatLocalDateTimeInTimeZone(range.toDate, range.endTime, timezone),
      };
    });

    await withAuth(request, async () => {
      await CompanyUserScheduleUnavailabilityController.companyUserCreateUnavailabilityRanges({ body: payload });
    });

    return redirectWithSuccess(request, redirectTo, 'Fravær lagret');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre fravær');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

/**
 * Nytt fravær (Skjema, approved sketch 2026-11-11): one continuous period, like a calendar event. Hele dagen first (off),
 * then Starter and Slutter, each a date with its time on the same row, so "12:00" and "18:00" can only mean the start
 * on the first day and the end on the last. Slutter follows Starter, so one day is one click. The Lagre bar says what
 * will be saved, or why it can't be.
 */
export default function CompanyBookingScheduleUnavailabilityCreatePage({ loaderData }: Route.ComponentProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle' && navigation.formMethod === 'POST';
  const today = format(new Date(), 'yyyy-MM-dd');

  const [draft, setDraft] = useState<AbsenceDraft>(() => loaderData.prefill ?? defaultAbsenceDraft(new Date()));
  const [openTime, setOpenTime] = useState<'start' | 'end' | null>(null);
  const summary = absenceSummary(draft, new Date());
  const update = (next: Partial<AbsenceDraft>) => setDraft((current) => ({ ...current, ...next }));

  const row = (which: 'start' | 'end') => {
    const isStart = which === 'start';
    const label = isStart ? 'Starter' : 'Slutter';
    return (
      <div className="flex flex-col gap-2">
        <Label id={`absence-${which}-label`}>{label}</Label>
        <div className={draft.wholeDay ? '' : 'grid grid-cols-[minmax(0,1fr)_7rem] gap-2'}>
          <DateField
            aria-labelledby={`absence-${which}-label`}
            value={isStart ? draft.startDay : draft.endDay}
            minDay={isStart ? today : draft.startDay}
            onChange={(day) => (isStart ? setDraft((current) => withStartDay(current, day)) : update({ endDay: day }))}
          />
          {draft.wholeDay ? null : (
            <TimePicker
              value={isStart ? draft.startTime : draft.endTime}
              placeholder="Tid"
              contextLabel={`${label}, klokkeslett`}
              isOpen={openTime === which}
              onOpenChange={(open) => setOpenTime(open ? which : null)}
              onChange={(time) => update(isStart ? { startTime: time } : { endTime: time })}
              panelAlign="end"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <CompanyFormPageTemplate
      title="Nytt fravær"
      submit={{
        form: 'schedule-unavailability-form',
        loading: isSubmitting,
        disabled: !summary.valid,
        message: summary.text,
      }}
    >
      <form
        id="schedule-unavailability-form"
        className="flex max-w-xl flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!summary.valid) return;
          const body = new FormData();
          body.append('ranges', JSON.stringify([summary.range]));
          submit(body, { method: 'post' });
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <Label id="absence-whole-day-label">Hele dagen</Label>
          <Switch
            aria-labelledby="absence-whole-day-label"
            checked={draft.wholeDay}
            onCheckedChange={(wholeDay) => update({ wholeDay })}
          />
        </div>
        {row('start')}
        {row('end')}
      </form>
    </CompanyFormPageTemplate>
  );
}
