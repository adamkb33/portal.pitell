import { Zap } from 'lucide-react';
import { formatFullDate, formatTime } from '~/lib/date.utils';

type QuickBookButtonProps = {
  slot: {
    date: string;
    time: string;
  };
  disabled?: boolean;
  /** Picks the time without submitting a form (Ny time on the company side). */
  onSelect?: (time: string) => void;
};

export function QuickBookButton({ slot, disabled = false, onSelect }: QuickBookButtonProps) {
  const className =
    'flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed border-booking-action/50 bg-booking-surface-muted p-4 transition-colors hover:border-booking-action hover:bg-booking-surface-muted disabled:cursor-not-allowed disabled:opacity-50';
  const body = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-booking-action">
          <Zap className="size-5 text-booking-action-contrast" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-booking-text md:text-base">Første ledige tid</p>
          <p className="text-xs text-booking-text-muted md:text-sm">
            {formatFullDate(slot.date)} kl. {formatTime(slot.time)}
          </p>
        </div>
      </div>
      <span className="text-xs font-medium text-booking-action-text">Velg →</span>
    </>
  );

  // Ny time (company side) picks the time in the page; the customer flow submits it.
  return onSelect ? (
    <button type="button" disabled={disabled} onClick={() => onSelect(slot.time)} className={className}>
      {body}
    </button>
  ) : (
    <button type="submit" name="startTime" value={slot.time} disabled={disabled} className={className}>
      {body}
    </button>
  );
}
