import * as React from 'react';
import { cn } from '../lib/cn';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** An on/off setting that takes effect in the form (Hele dagen). `role="switch"`, 44px tap target on phones. */
export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group inline-flex min-h-11 shrink-0 items-center focus-visible:outline-none lg:min-h-9',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-interactive group-focus-visible:ring-offset-2',
          checked ? 'bg-interactive' : 'bg-field-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  );
}
