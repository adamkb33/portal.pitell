import * as React from 'react';
import { cn } from '../lib/cn';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'booking';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  variant?: InputVariant;
  /** Leading icon rendered inside the field (template `.input-icon`). */
  startIcon?: React.ReactNode;
  /** Invalid styling (template `.is-invalid`). */
  invalid?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'min-h-10 px-3 py-1.5 text-sm sm:h-8 sm:min-h-8 sm:py-0',
  md: 'min-h-11 px-3 py-2 text-sm sm:h-10 sm:min-h-10 sm:py-0',
  lg: 'h-12 px-4 text-base',
};

const variantClasses: Record<InputVariant, string> = {
  default:
    'border-field-border bg-background text-text-primary placeholder:text-text-placeholder focus-visible:border-interactive focus-visible:ring-blue-50 disabled:bg-surface-variant-2 disabled:text-text-disabled',
  booking:
    'border-booking-field-border bg-booking-surface-strong text-booking-text placeholder:text-booking-text-muted focus-visible:border-booking-action focus-visible:ring-booking-action/25 disabled:bg-booking-surface-muted disabled:text-booking-text-muted',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', variant = 'default', startIcon, invalid = false, className, disabled, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-[var(--radius-field)] border',
        'transition-[color,border-color,box-shadow,background-color] motion-safe:duration-base motion-safe:ease-default',
        'focus-visible:outline-none focus-visible:ring-[3px]',
        variantClasses[variant],
        invalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger-soft',
        disabled && 'cursor-not-allowed',
        sizeClasses[size],
        startIcon && (size === 'lg' ? 'pl-11' : 'pl-10'),
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );

  if (!startIcon) return input;

  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-disabled [&_svg]:size-full">
        {startIcon}
      </span>
      {input}
    </div>
  );
});
