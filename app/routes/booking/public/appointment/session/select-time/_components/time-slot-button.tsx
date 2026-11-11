import { cn } from '~/ui';
import { formatTime } from '~/lib/date.utils';

type TimeSlotButtonProps = {
  time: string;
  isSelected: boolean;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  /** Picks the time without submitting a form (Ny time on the company side). Without it, the button submits `startTime`. */
  onSelect?: (time: string) => void;
};

export function TimeSlotButton({
  time,
  isSelected,
  disabled = false,
  variant = 'default',
  onSelect,
}: TimeSlotButtonProps) {
  const isCompact = variant === 'compact';

  const className = cn(
    'flex w-full items-center justify-center rounded-[var(--radius-booking-control)] border-[length:var(--border-booking-selected)] font-bold transition-all',
    isCompact ? 'min-h-10 px-3 py-2 text-xs' : 'min-h-12 px-4 py-3 text-sm md:min-h-11 md:text-base',
    isSelected && [
      'border-booking-action bg-booking-action text-booking-action-contrast',
      'shadow-[var(--shadow-booking-card)] ring-[length:var(--border-booking-focus-ring)] ring-booking-action/20 ring-offset-2',
    ],
    !isSelected && [
      'border-booking-border bg-booking-surface text-booking-text',
      'hover:border-booking-action/50 hover:bg-booking-surface-muted',
      'active:scale-95',
    ],
    disabled && 'cursor-not-allowed opacity-50',
  );
  const label = <span>{formatTime(time)}</span>;

  // Ny time (company side) picks the time in the page; the customer flow submits it.
  return onSelect ? (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={() => onSelect(time)}
      className={className}
    >
      {label}
    </button>
  ) : (
    <button type="submit" name="startTime" value={time} disabled={disabled} className={className}>
      {label}
    </button>
  );
}
