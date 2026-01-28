import { HOURS, SLOT_HEIGHT_PX } from './constants';
import { formatHour } from './time-utils';

type HourSlotsProps = {
  showLabels?: boolean;
};

export function HourSlots({ showLabels = false }: HourSlotsProps) {
  return (
    <div className="relative">
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="border-t border-border/60 text-[10px] text-muted-foreground"
          style={{ height: `${SLOT_HEIGHT_PX}px` }}
        >
          {showLabels && <span className="-translate-y-1/2 inline-block bg-card pr-1">{formatHour(hour)}</span>}
        </div>
      ))}
    </div>
  );
}
