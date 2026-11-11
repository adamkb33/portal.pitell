import { useState } from 'react';
import { data, useNavigation, useSubmit } from 'react-router';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { Route } from './+types/company.booking.schedule-unavailability.detail.route';
import { CompanyUserScheduleUnavailabilityController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { formatDateBoundaryInTimeZone, formatDateInputInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyPageTemplate } from '~/ui';
import { absenceLine, absenceTitle, isPastAbsence } from '../_utils/absence';

const TIME_ZONE = 'Europe/Oslo';
const LIST_HREF = () => ROUTES_MAP['company.booking.schedule-unavailability'].href;

/** One absence. There is no endpoint for a single one, so it's found again in its own date range. */
export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const from = new Date(params.get('from') ?? '');
  const to = new Date(params.get('to') ?? '');
  if (!id || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return redirectWithError(request, LIST_HREF(), 'Fant ikke fraværet');
  }

  try {
    const response = await withAuth(request, async () =>
      CompanyUserScheduleUnavailabilityController.companyUserGetGroupedUnavailabilityRanges({
        query: {
          fromDateTime: formatDateBoundaryInTimeZone(formatDateInputInTimeZone(from, TIME_ZONE), 'start', TIME_ZONE),
          toDateTime: formatDateBoundaryInTimeZone(formatDateInputInTimeZone(to, TIME_ZONE), 'end', TIME_ZONE),
        },
      }),
    );
    const group = (response.data?.data ?? []).find((candidate) => candidate.id === id);
    if (!group) return redirectWithError(request, LIST_HREF(), 'Fant ikke fraværet');

    return data({ group, past: isPastAbsence(group) });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente fravær');
    return redirectWithError(request, LIST_HREF(), message);
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const ids = String(formData.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);
  if (formData.get('intent') !== 'delete' || ids.length === 0) {
    return redirectWithError(request, LIST_HREF(), 'Fant ikke fraværet');
  }

  try {
    await withAuth(request, async () =>
      CompanyUserScheduleUnavailabilityController.companyUserDeleteUnavailabilityRanges({ body: { ids } }),
    );
    return redirectWithSuccess(request, LIST_HREF(), 'Fravær slettet');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke slette fravær');
    return redirectWithError(request, LIST_HREF(), message);
  }
}

const longDay = (value: string) => {
  const text = format(new Date(value), 'EEEE d. MMM', { locale: nb });
  return text.charAt(0).toLocaleUpperCase('nb-NO') + text.slice(1);
};

/** Detail page for one absence: Fra, Til, Tid, and delete at the bottom (page type: detail). */
export default function CompanyBookingScheduleUnavailabilityDetailPage({ loaderData }: Route.ComponentProps) {
  const { group, past } = loaderData;
  const navigation = useNavigation();
  const submit = useSubmit();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const isDeleting = navigation.state !== 'idle';
  const title = absenceTitle(group);
  // A whole-day absence that ends at midnight belongs to the day before (same rule as the title).
  const lastDay =
    format(new Date(group.to), 'HH:mm') === '00:00'
      ? new Date(new Date(group.to).getTime() - 60_000).toISOString()
      : group.to;

  return (
    <CompanyPageTemplate title={`Fravær ${title}`}>
      <section aria-label={`Fravær ${title}`} className="overflow-hidden rounded-xl border border-border bg-background">
        <dl className="divide-y divide-border">
          {[
            ['Fra', longDay(group.from)],
            ['Til', longDay(lastDay)],
            ['Tid', absenceLine(group)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <dt className="text-text-secondary">{label}</dt>
              <dd className="font-semibold text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>

        {past ? null : (
          <div className="flex justify-end border-t border-border px-2 py-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
            >
              Slett fravær
            </button>
          </div>
        )}
      </section>

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => {
          const formData = new FormData();
          formData.append('intent', 'delete');
          formData.append('ids', group.ids.join(','));
          submit(formData, { method: 'post' });
          setIsDeleteOpen(false);
        }}
        title={`Slett fravær ${title.charAt(0).toLocaleLowerCase('nb-NO')}${title.slice(1)}?`}
        description="Kundene kan bestille time i dette tidsrommet igjen. Dette kan ikke angres."
        confirmText="Slett fravær"
      />
    </CompanyPageTemplate>
  );
}
