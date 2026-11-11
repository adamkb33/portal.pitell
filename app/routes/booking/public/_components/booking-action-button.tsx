import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '~/ui';
import {
  bookingActionBaseClass,
  bookingActionSizeClass,
  bookingActionVariantClass,
  type BookingActionSize,
  type BookingActionVariant,
} from './booking-action-styles';

export interface BookingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BookingActionVariant;
  size?: BookingActionSize;
  fullWidth?: boolean;
  loading?: boolean;
}

export const BookingActionButton = React.forwardRef<HTMLButtonElement, BookingActionButtonProps>(
  function BookingActionButton(
    { variant = 'primary', size = 'md', fullWidth = false, className, disabled, loading = false, children, ...props },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          bookingActionBaseClass,
          bookingActionVariantClass[variant],
          // Inline buttons take the size of the sentence they sit in.
          variant !== 'inline' && bookingActionSizeClass[size],
          fullWidth && 'w-full',
          // Disabled keeps full-contrast text on a neutral fill (faded brand colour reads as broken); loading just dims.
          disabled &&
            !loading &&
            'cursor-not-allowed border-booking-border bg-booking-surface-subtle text-booking-text-muted shadow-none hover:bg-booking-surface-subtle',
          loading && 'cursor-wait opacity-70',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
