import { useState } from 'react';
import { Form, useNavigation, useSubmit } from 'react-router';
import { format } from 'date-fns';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { DateField } from '~/components/pickers/date-field';
import { StartEndTimeSelector } from '~/components/pickers/start-end-time-selector';
import { CompanyFormPageTemplate, Label } from '~/ui';
import { dayTitle, durationLabel } from '../../../_utils/periods';

export type AvailabilityFormValues = {
  id?: number;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  startTime: string;
  endTime: string;
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

/** Ny bookbar tid and editing one (page type Skjema): Dato, then Fra/Til side by side, Lagre bar with the result. */
export function AvailabilityFormPage({ mode, values }: { mode: 'create' | 'edit'; values: AvailabilityFormValues }) {
  const navigation = useNavigation();
  const submit = useSubmit();
  const [date, setDate] = useState(values.date);
  const [startTime, setStartTime] = useState(values.startTime);
  const [endTime, setEndTime] = useState(values.endTime);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const intent = navigation.formData?.get('intent');
  const isSaving = navigation.state !== 'idle' && intent !== 'delete';
  const isDeleting = navigation.state !== 'idle' && intent === 'delete';
  const day = new Date(`${date}T00:00:00`);
  const today = format(new Date(), 'yyyy-MM-dd');
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const valid = start !== null && end !== null && end > start;

  return (
    <CompanyFormPageTemplate
      title={mode === 'create' ? 'Ny bookbar tid' : dayTitle(day)}
      submit={{
        form: 'availability-form',
        loading: isSaving,
        disabled: !valid,
        // The result in one line, or why Lagre is off.
        message: valid
          ? `${dayTitle(day)} · ${startTime}–${endTime} · ${durationLabel((end ?? 0) - (start ?? 0))}`
          : 'Til må være etter fra',
      }}
    >
      <Form id="availability-form" method="post" className="space-y-4">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <input type="hidden" name="date" value={date} />

        <div className="flex flex-col gap-2">
          <Label id="availability-date-label">Dato</Label>
          <DateField
            aria-labelledby="availability-date-label"
            value={date}
            onChange={setDate}
            // Editing keeps its own day reachable even if it is already in the past.
            minDay={date < today ? date : today}
          />
        </div>

        {/* Two columns: the labels sit in the first row, the two pickers the selector renders in the second. */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Label>Fra</Label>
          <Label>Til</Label>
          <StartEndTimeSelector
            startName="startTime"
            endName="endTime"
            startValue={startTime}
            endValue={endTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
            endPanelAlign="end"
          />
        </div>
      </Form>

      {mode === 'edit' && values.id ? (
        <div className="flex justify-end border-t border-border pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
          >
            Slett bookbar tid
          </button>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => {
          const formData = new FormData();
          formData.append('intent', 'delete');
          formData.append('id', String(values.id));
          submit(formData, { method: 'post' });
          setIsDeleteOpen(false);
        }}
        title={`Slett bookbar tid ${dayTitle(day).toLocaleLowerCase('nb-NO')}?`}
        description="Kundene kan ikke lenger bestille i dette tidsrommet. Dette kan ikke angres."
        confirmText="Slett bookbar tid"
      />
    </CompanyFormPageTemplate>
  );
}
