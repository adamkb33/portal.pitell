export type BookingActionVariant =
  | 'primary'
  | 'confirm'
  | 'danger'
  | 'secondary'
  | 'tonal'
  | 'outline'
  | 'ghost'
  | 'inline';

export type BookingActionSize = 'sm' | 'md';

export const bookingActionBaseClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-booking-control)] border-[length:var(--border-booking-control)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-[length:var(--border-booking-focus-ring)] focus-visible:ring-booking-action-text';

export const bookingActionVariantClass: Record<BookingActionVariant, string> = {
  primary:
    'border-booking-action bg-booking-action text-booking-action-contrast shadow-sm hover:bg-booking-action-hover',
  confirm:
    'border-booking-confirm bg-booking-confirm text-booking-confirm-contrast shadow-sm hover:bg-booking-confirm-hover focus-visible:ring-booking-confirm',
  danger:
    'border-booking-danger bg-booking-danger text-booking-danger-contrast shadow-sm hover:bg-booking-danger-hover focus-visible:ring-booking-danger',
  secondary:
    'border-booking-action bg-booking-surface-raised text-booking-action-text hover:bg-booking-action-muted active:bg-booking-action-muted',
  tonal:
    'border-booking-border-strong bg-booking-action-muted text-booking-text hover:bg-booking-surface-strong active:bg-booking-surface-strong',
  outline:
    'border-booking-border bg-booking-surface-raised text-booking-text hover:bg-booking-surface-subtle active:bg-booking-surface-strong',
  ghost: 'border-transparent bg-transparent text-booking-text hover:bg-booking-surface-muted',
  inline:
    'min-h-0 justify-start rounded-none border-transparent bg-transparent p-0 text-booking-action-text underline-offset-4 hover:underline',
};

export const bookingActionSizeClass: Record<BookingActionSize, string> = {
  sm: 'min-h-10 px-3 py-1.5 text-xs md:text-sm',
  md: 'min-h-12 px-2 py-0 text-sm md:px-3',
};
