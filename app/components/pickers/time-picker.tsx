import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { Button } from '~/ui';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '~/ui';
import { cn } from '~/lib/utils';

type TimePickerProps = {
  value: string;
  placeholder: string;
  contextLabel?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (nextValue: string) => void;
  startHour?: number;
  minuteStep?: number;
  zIndex?: number;
  disabled?: boolean;
  className?: string;
  panelAlign?: 'start' | 'end';
  panelMode?: 'overlay' | 'inline';
  minValue?: string;
  maxValue?: string;
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

const toMinutes = (value: string) => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return null;
  const [hourRaw = '00', minuteRaw = '00'] = normalized.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

export function TimePicker({
  value,
  placeholder,
  contextLabel,
  isOpen,
  onOpenChange,
  onChange,
  startHour = 8,
  minuteStep = 5,
  zIndex = 60,
  disabled = false,
  className,
  panelAlign = 'start',
  panelMode = 'overlay',
  minValue,
  maxValue,
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
  const minMinutes = minValue ? toMinutes(minValue) : null;
  const maxMinutes = maxValue ? toMinutes(maxValue) : null;
  const [contextName, contextPart] = contextLabel?.split(' — ') ?? [];
  const questionVerb = contextPart?.toLowerCase() === 'fra' ? 'starter' : 'slutter';

  const panel = isOpen ? (
    <div
      data-time-picker-panel
      className={cn(
        'mt-1.5 rounded-md border border-border bg-overlay-surface p-0 shadow-lg',
        panelMode === 'inline'
          ? 'relative z-0 w-full'
          : 'absolute top-full z-[60] hidden w-[214px] max-w-[calc(100vw-2rem)] sm:block',
        panelMode === 'overlay' && (panelAlign === 'end' ? 'right-0' : 'left-0'),
      )}
      style={panelMode === 'overlay' ? { zIndex } : undefined}
    >
      <div className="border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">Velg tid</p>
        <div className="mt-0.5 text-sm font-semibold text-text-primary">{pendingValue || '--:--'}</div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-2">
        <div>
          <div
            ref={hourListRef}
            className="h-28 overflow-y-auto overscroll-contain rounded-sm border border-border bg-background p-1 touch-pan-y pointer-events-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {hourOptions.map((hour, index) => {
              const hourMinute = Number(hour) * 60;
              const isHourUnavailable =
                (minMinutes != null && hourMinute + 59 < minMinutes) || (maxMinutes != null && hourMinute > maxMinutes);
              return (
                <button
                  key={hour}
                  type="button"
                  data-hour={hour}
                  disabled={isHourUnavailable}
                  className={cn(
                    'w-full rounded-sm px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-primary-subtle hover:text-primary',
                    index % 2 === 0 ? 'bg-surface/60' : 'bg-transparent',
                    pendingHour === hour && 'bg-surface-primary-subtle text-primary font-semibold',
                    isHourUnavailable && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-secondary',
                  )}
                  onClick={() => !isHourUnavailable && setPendingHour(hour)}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div
            className="h-28 overflow-y-auto overscroll-contain rounded-sm border border-border bg-background p-1 touch-pan-y pointer-events-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {minuteOptions.map((minute, index) => {
              const minuteValue = Number(minute);
              const combinedMinutes = Number(pendingHour) * 60 + minuteValue;
              const isMinuteUnavailable =
                (minMinutes != null && combinedMinutes < minMinutes) ||
                (maxMinutes != null && combinedMinutes > maxMinutes);
              return (
                <button
                  key={minute}
                  type="button"
                  data-minute={minute}
                  disabled={isMinuteUnavailable}
                  className={cn(
                    'w-full rounded-sm px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-primary-subtle hover:text-primary',
                    index % 2 === 0 ? 'bg-surface/60' : 'bg-transparent',
                    pendingMinute === minute && 'bg-surface-primary-subtle text-primary font-semibold',
                    isMinuteUnavailable &&
                      'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-secondary',
                  )}
                  onClick={() => !isMinuteUnavailable && setPendingMinute(minute)}
                >
                  {minute}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 border-t border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onOpenChange(false)}
        >
          Avbryt
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="h-7 px-2 text-xs"
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

  const mobileSheet = (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl px-4 pb-6 pt-3 sm:hidden">
        <div className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden />
        <SheetHeader className="px-0 pb-0">
          <SheetTitle>
            {contextName && contextPart ? (
              <>
                Når {questionVerb} du på <span className="text-interactive">{contextName}</span>?
              </>
            ) : (
              'Velg tid'
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="text-center text-3xl font-semibold tabular-nums text-interactive">{pendingValue}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-surface-variant-1 p-2">
          <TimeWheel label="Time" options={hourOptions} value={pendingHour} onChange={setPendingHour} />
          <span className="text-lg font-semibold text-text-secondary">:</span>
          <TimeWheel label="Minutt" options={minuteOptions} value={pendingMinute} onChange={setPendingMinute} />
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2 px-0 pb-0 pt-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            type="button"
            onClick={() => {
              onChange(pendingValue);
              onOpenChange(false);
            }}
          >
            Bruk {pendingValue}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => !disabled && onOpenChange(!isOpen)}
        ref={triggerRef}
        // The button only shows the time, so name what it sets ("Mandag — Fra: 09:00") for screen readers.
        aria-label={contextLabel ? `${contextLabel}: ${normalized || placeholder}` : undefined}
        aria-expanded={isOpen}
        disabled={disabled}
        className={cn(
          'h-11 w-full justify-between gap-2 rounded-lg border border-field-border bg-background px-3 text-text-primary shadow-none',
          'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
          isOpen && 'border-ring ring-2 ring-ring/40',
          !value && 'text-text-secondary',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <span className="text-sm font-medium">{normalized || placeholder}</span>
        <Clock3 className="size-4 text-text-secondary" />
      </Button>
      {panel}
      {mobileSheet}
    </div>
  );
}

function TimeWheel({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="sr-only">{label}</span>
      <div className="h-32 snap-y overflow-y-auto rounded-lg border border-border bg-background p-1 text-center">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={`${label} ${option}`}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              'block h-10 w-full snap-center rounded-md text-base tabular-nums text-text-secondary',
              value === option && 'bg-interactive/10 font-semibold text-interactive',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
