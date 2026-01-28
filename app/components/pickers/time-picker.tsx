import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

type TimePickerProps = {
  value: string;
  placeholder: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (nextValue: string) => void;
  startHour?: number;
  minuteStep?: number;
  zIndex?: number;
  disabled?: boolean;
  className?: string;
};

const normalizeTimeValue = (value: string) => {
  if (!value) return '';
  const [hours = '00', minutes = '00'] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const buildTimeValue = (base: string, nextHour?: string, nextMinute?: string) => {
  const [hours = '00', minutes = '00'] = normalizeTimeValue(base || '00:00').split(':');
  return `${nextHour ?? hours}:${nextMinute ?? minutes}`;
};

export function TimePicker({
  value,
  placeholder,
  isOpen,
  onOpenChange,
  onChange,
  startHour = 8,
  minuteStep = 5,
  zIndex = 60,
  disabled = false,
  className,
}: TimePickerProps) {
  const normalized = normalizeTimeValue(value);
  const [selectedHour, selectedMinute] = normalized ? normalized.split(':') : ['00', '00'];
  const [pendingHour, setPendingHour] = useState<string>(selectedHour);
  const [pendingMinute, setPendingMinute] = useState<string>(selectedMinute);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hourListRef = useRef<HTMLDivElement | null>(null);

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')), []);

  const minuteOptions = useMemo(() => {
    const steps = Math.max(1, Math.floor(60 / minuteStep));
    return Array.from({ length: steps }, (_, index) => String(index * minuteStep).padStart(2, '0'));
  }, [minuteStep]);

  useEffect(() => {
    if (!isOpen) return;
    setPendingHour(selectedHour);
    setPendingMinute(selectedMinute);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const targetHour = value ? selectedHour : String(startHour).padStart(2, '0');
    requestAnimationFrame(() => {
      const container = hourListRef.current;
      if (!container) return;
      const target = container.querySelector<HTMLButtonElement>(`[data-hour="${targetHour}"]`);
      if (!target) return;
      const nextTop = target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2;
      container.scrollTop = Math.max(0, nextTop);
    });
  }, [isOpen, selectedHour, startHour, value]);

  const pendingValue = buildTimeValue(value || '00:00', pendingHour, pendingMinute);

  const panel = isOpen ? (
    <div
      data-time-picker-panel
      className="absolute top-full left-0 z-[60] mt-2 w-[240px] rounded-lg border border-card-border bg-card shadow-lg"
      style={{ zIndex }}
    >
      <div className="border-b border-card-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-form-text-muted">Velg tid</p>
        <div className="mt-1 text-lg font-semibold text-form-text">{pendingValue || '--:--'}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
        <div>
          <div
            ref={hourListRef}
            className="h-32 overflow-y-scroll overscroll-contain rounded-md border border-form-border bg-form-bg p-1 touch-pan-y pointer-events-auto text-md"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {hourOptions.map((hour, index) => {
              return (
                <button
                  key={hour}
                  type="button"
                  data-hour={hour}
                  className={cn(
                    'w-full px-2 py-1 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary',
                    index % 2 === 0 ? 'bg-primary/10' : 'bg-transparent',
                    'border-b border-form-border last:border-b-0',
                    pendingHour === hour && 'bg-primary/20 text-primary font-semibold',
                  )}
                  onClick={() => setPendingHour(hour)}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div
            className="h-32 overflow-y-scroll overscroll-contain rounded-md border border-form-border bg-form-bg p-1 touch-pan-y pointer-events-auto text-md"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {minuteOptions.map((minute, index) => {
              return (
                <button
                  key={minute}
                  type="button"
                  className={cn(
                    'w-full px-2 py-1 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary',
                    index % 2 === 0 ? 'bg-primary/10' : 'bg-transparent',
                    'border-b border-form-border last:border-b-0',
                    pendingMinute === minute && 'bg-primary/20 text-primary font-semibold',
                  )}
                  onClick={() => setPendingMinute(minute)}
                >
                  {minute}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-card-border px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          Avbryt
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => {
            onChange(pendingValue);
            onOpenChange(false);
          }}
        >
          OK
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => !disabled && onOpenChange(!isOpen)}
        ref={triggerRef}
        disabled={disabled}
        className={cn(
          'h-11 w-full justify-between gap-2 rounded-md border border-form-border bg-form-bg px-3 text-form-text shadow-none',
          'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
          isOpen && 'border-ring ring-2 ring-ring/40',
          !value && 'text-form-text-muted',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <span className="text-sm">{normalized || placeholder}</span>
        <Clock3 className="size-4 text-form-text-muted" />
      </Button>
      {panel}
    </div>
  );
}
