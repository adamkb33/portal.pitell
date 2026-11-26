import * as React from 'react';
import { cn } from '../lib/cn';

type VerificationCodeInputProps = Omit<
  React.ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'onChange' | 'maxLength' | 'pattern'
> & {
  value: string;
  onChange: (value: string) => void;
  length?: number;
};

/** Keeps digits only, capped at the code length, so pasted text like "123 456" just works. */
export function normalizeVerificationCode(value: string, length: number) {
  return value.replace(/\D/g, '').slice(0, length);
}

export function VerificationCodeInput({
  value,
  onChange,
  length = 6,
  className,
  ...props
}: VerificationCodeInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={length}
      pattern={`\\d{${length}}`}
      value={value}
      onChange={(event) => onChange(normalizeVerificationCode(event.target.value, length))}
      className={cn(
        'h-14 w-full rounded-md border-2 border-form-border bg-form-bg text-form-text',
        // Monospaced and widely spaced so the digits read as slots without extra markup.
        // The indent offsets the trailing letter-space so the code stays visually centred.
        'text-center font-mono text-2xl tracking-[0.5em] indent-[0.5em]',
        'focus:border-form-ring focus:outline-none focus:ring-2 focus:ring-form-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    />
  );
}
