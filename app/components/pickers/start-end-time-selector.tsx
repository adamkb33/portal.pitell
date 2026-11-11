import { useEffect, useState } from 'react';
import { TimePicker } from '~/components/pickers/time-picker';

type StartEndTimeSelectorProps = {
  startName?: string;
  endName?: string;
  startValue: string;
  endValue: string;
  onStartChange: (next: string) => void;
  onEndChange: (next: string) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  startLabel?: string;
  endLabel?: string;
  zIndex?: number;
  endPanelAlign?: 'start' | 'end';
  panelMode?: 'overlay' | 'inline';
  className?: string;
};

function toMinutes(value: string): number | null {
  if (!value) return null;
  const [hourRaw = '00', minuteRaw = '00'] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function StartEndTimeSelector({
  startName = 'startTime',
  endName = 'endTime',
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startPlaceholder = 'Starttid',
  endPlaceholder = 'Sluttid',
  startLabel,
  endLabel,
  zIndex = 60,
  endPanelAlign = 'end',
  panelMode = 'overlay',
  className,
}: StartEndTimeSelectorProps) {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  useEffect(() => {
    const startMinutes = toMinutes(startValue);
    const endMinutes = toMinutes(endValue);
    if (startMinutes == null || endMinutes == null) return;
    if (endMinutes < startMinutes) {
      onEndChange(startValue);
    }
  }, [startValue, endValue, onEndChange]);

  const fields = (
    <>
      <div>
        <input type="hidden" name={startName} value={startValue} />
        <TimePicker
          value={startValue}
          placeholder={startPlaceholder}
          contextLabel={startLabel}
          isOpen={isStartOpen}
          onOpenChange={(open) => {
            setIsStartOpen(open);
            if (open) setIsEndOpen(false);
          }}
          onChange={onStartChange}
          zIndex={zIndex}
          panelMode={panelMode}
        />
      </div>

      <div>
        <input type="hidden" name={endName} value={endValue} />
        <TimePicker
          value={endValue}
          placeholder={endPlaceholder}
          contextLabel={endLabel}
          isOpen={isEndOpen}
          onOpenChange={(open) => {
            if (!startValue) return;
            setIsEndOpen(open);
            if (open) setIsStartOpen(false);
          }}
          onChange={onEndChange}
          minValue={startValue || undefined}
          zIndex={zIndex}
          disabled={!startValue}
          panelAlign={endPanelAlign}
          panelMode={panelMode}
        />
      </div>
    </>
  );

  return className ? <div className={className}>{fields}</div> : fields;
}
