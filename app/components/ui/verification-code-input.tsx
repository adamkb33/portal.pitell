import * as React from 'react';
import { cn } from '~/lib/utils';

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  className?: string;
  boxClassName?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
  onComplete?: (value: string) => void;
};

function normalizeValue(value: string, length: number) {
  return value.replace(/\D/g, '').slice(0, length);
}

export function VerificationCodeInput({
  value,
  onChange,
  length = 6,
  name,
  id,
  disabled = false,
  required = false,
  autoComplete = 'one-time-code',
  inputMode = 'numeric',
  className,
  boxClassName,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel = 'Verification code',
  onComplete,
}: VerificationCodeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const normalized = normalizeValue(value, length);
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  // Call onComplete when code is fully entered
  React.useEffect(() => {
    if (normalized.length === length && onComplete) {
      onComplete(normalized);
    }
  }, [normalized, length, onComplete]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const newValue = input.value;
    const cursorPos = input.selectionStart ?? 0;

    const cleaned = normalizeValue(newValue, length);
    onChange(cleaned);

    // Maintain cursor position after change
    requestAnimationFrame(() => {
      const newPos = Math.min(cursorPos, cleaned.length);
      input.setSelectionRange(newPos, newPos);
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!pasted) return;
    event.preventDefault();
    const cleaned = normalizeValue(pasted, length);
    onChange(cleaned);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const hasSelection = cursorPos !== selectionEnd;

    // Arrow key navigation
    if (event.key === 'ArrowLeft' && cursorPos > 0 && !hasSelection) {
      event.preventDefault();
      input.setSelectionRange(cursorPos - 1, cursorPos - 1);
      setFocusedIndex(cursorPos - 1);
    } else if (event.key === 'ArrowRight' && cursorPos < length && !hasSelection) {
      event.preventDefault();
      input.setSelectionRange(cursorPos + 1, cursorPos + 1);
      setFocusedIndex(cursorPos + 1);
    }
  };

  const focusInputAt = (index: number) => {
    const input = inputRef.current;
    if (!input || disabled) return;

    input.focus();
    setFocusedIndex(index);

    // Select the character at this position if it exists, otherwise just position cursor
    requestAnimationFrame(() => {
      if (normalized[index]) {
        // Select the digit so typing replaces it
        input.setSelectionRange(index, index + 1);
      } else {
        // Position cursor at empty box
        input.setSelectionRange(index, index);
      }
    });
  };

  const handleFocus = () => {
    if (focusedIndex === null) {
      // Default focus position
      const input = inputRef.current;
      if (input) {
        const pos = normalized.length;
        input.setSelectionRange(pos, pos);
        setFocusedIndex(pos);
      }
    }
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Visual boxes */}
      <div
        className="grid gap-2 pointer-events-none"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length }).map((_, index) => {
          const char = normalized[index] ?? '';
          const isFilled = Boolean(char);
          const isActive = focusedIndex === index;

          return (
            <div
              key={index}
              data-filled={isFilled}
              data-active={isActive}
              onClick={() => focusInputAt(index)}
              className={cn(
                'flex h-12 items-center justify-center border-2 bg-form-bg text-form-text text-lg font-semibold',
                'rounded-md transition-all select-none pointer-events-auto',
                'border-form-border',
                'data-[active=true]:border-form-ring data-[active=true]:ring-2 data-[active=true]:ring-form-ring',
                'data-[filled=true]:border-form-text',
                !disabled && 'cursor-pointer hover:border-form-ring',
                disabled && 'opacity-60 cursor-not-allowed',
                boxClassName,
              )}
              aria-hidden="true"
            >
              {char}
            </div>
          );
        })}
      </div>

      {/* Hidden input */}
      <input
        id={id}
        name={name}
        type="text"
        inputMode={inputMode}
        pattern="[0-9]*"
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        value={normalized}
        onChange={handleInputChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="sr-only"
        ref={inputRef}
        maxLength={length}
      />
    </div>
  );
}
