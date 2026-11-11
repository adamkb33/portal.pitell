import type { DailyScheduleDto } from '~/api/generated';
import type { FormFieldRenderProps } from '~/components/dialog/form-dialog';

interface DailyScheduleRendererProps {
  helperText?: string;
  emptyText?: string;
}

const DAY_LABELS: Record<DailyScheduleDto['dayOfWeek'], string> = {
  MONDAY: 'Mandag',
  TUESDAY: 'Tirsdag',
  WEDNESDAY: 'Onsdag',
  THURSDAY: 'Torsdag',
  FRIDAY: 'Fredag',
  SATURDAY: 'Lørdag',
  SUNDAY: 'Søndag',
};

const DAY_ORDER: DailyScheduleDto['dayOfWeek'][] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/**
 * Daily schedule renderer for booking profile
 * - Quick set standard hours (Mon-Fri 09:00-17:00)
 * - Individual day toggle with custom times
 * - Compact mobile-first design
 */
export const createDailyScheduleRenderer = ({
  helperText = 'Velg hvilke dager og klokkeslett du er tilgjengelig.',
  emptyText = 'Ingen arbeidstider satt ennå.',
}: DailyScheduleRendererProps = {}) => {
  return ({ value, onChange }: FormFieldRenderProps<any>) => {
    const schedules = (value as DailyScheduleDto[]) || [];

    const setStandardHours = () => {
      const standard: DailyScheduleDto[] = [
        { id: 0, dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '17:00:00' },
        { id: 0, dayOfWeek: 'TUESDAY', startTime: '09:00:00', endTime: '17:00:00' },
        { id: 0, dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '17:00:00' },
        { id: 0, dayOfWeek: 'THURSDAY', startTime: '09:00:00', endTime: '17:00:00' },
        { id: 0, dayOfWeek: 'FRIDAY', startTime: '09:00:00', endTime: '17:00:00' },
      ];
      onChange(standard);
    };

    const toggleDay = (day: DailyScheduleDto['dayOfWeek']) => {
      const existing = schedules.find((s) => s.dayOfWeek === day);
      if (existing) {
        // Remove day
        onChange(schedules.filter((s) => s.dayOfWeek !== day));
      } else {
        // Add day with default hours
        onChange([...schedules, { id: 0, dayOfWeek: day, startTime: '09:00:00', endTime: '17:00:00' }]);
      }
    };

    const updateTime = (day: DailyScheduleDto['dayOfWeek'], field: 'startTime' | 'endTime', time: string) => {
      onChange(
        schedules.map((s) =>
          s.dayOfWeek === day
            ? { ...s, [field]: time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time }
            : s,
        ),
      );
    };

    const activeDays = new Set(schedules.map((s) => s.dayOfWeek));

    return (
      <div className="space-y-3">
        {/* Quick action button */}
        {schedules.length === 0 && (
          <button
            type="button"
            onClick={setStandardHours}
            className="w-full rounded border-2 border-form-accent bg-form-accent/10 px-3 py-2 text-sm font-medium text-form-accent transition-all hover:bg-form-accent/20"
          >
            Sett standard timer (Man-Fre 09:00-17:00)
          </button>
        )}

        <div className="max-h-80 space-y-3 overflow-y-auto rounded border border-form-border bg-form-bg p-3">
          {schedules.length === 0 ? (
            <p className="text-sm text-form-text-muted">{emptyText}</p>
          ) : (
            DAY_ORDER.filter((day) => activeDays.has(day)).map((day) => {
              const schedule = schedules.find((s) => s.dayOfWeek === day);
              if (!schedule) return null;

              const startTime = schedule.startTime.substring(0, 5);
              const endTime = schedule.endTime.substring(0, 5);

              return (
                <div key={day} className="space-y-2 rounded border-2 border-form-accent bg-form-accent/5 p-2.5">
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-form-text">{DAY_LABELS[day]}</span>
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className="text-xs text-form-text-muted hover:text-form-invalid transition-colors"
                    >
                      Fjern
                    </button>
                  </div>

                  {/* Time inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-form-text-muted">Fra</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => updateTime(day, 'startTime', e.target.value)}
                        className="w-full rounded border border-form-border bg-background px-2 py-1.5 text-sm text-form-text focus:outline-none focus:ring-1 focus:ring-form-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-form-text-muted">Til</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => updateTime(day, 'endTime', e.target.value)}
                        className="w-full rounded border border-form-border bg-background px-2 py-1.5 text-sm text-form-text focus:outline-none focus:ring-1 focus:ring-form-ring"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add missing days */}
        {schedules.length > 0 && activeDays.size < 7 && (
          <div className="space-y-2">
            <p className="text-xs text-form-text-muted">Legg til dag:</p>
            <div className="flex flex-wrap gap-2">
              {DAY_ORDER.filter((day) => !activeDays.has(day)).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="rounded border border-form-border bg-background px-2.5 py-1 text-xs font-medium text-form-text transition-all hover:border-form-accent hover:bg-form-accent/5"
                >
                  + {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>
        )}

        {helperText && <p className="text-xs text-form-text-muted">{helperText}</p>}
      </div>
    );
  };
};

/**
 * Direct component version
 */
export const DailyScheduleRenderer = ({
  value,
  onChange,
  helperText = 'Velg hvilke dager og klokkeslett du er tilgjengelig.',
  emptyText = 'Ingen arbeidstider satt ennå.',
}: FormFieldRenderProps<any> & DailyScheduleRendererProps) => {
  const schedules = (value as DailyScheduleDto[]) || [];

  const setStandardHours = () => {
    const standard: DailyScheduleDto[] = [
      { id: 0, dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '17:00:00' },
      { id: 0, dayOfWeek: 'TUESDAY', startTime: '09:00:00', endTime: '17:00:00' },
      { id: 0, dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '17:00:00' },
      { id: 0, dayOfWeek: 'THURSDAY', startTime: '09:00:00', endTime: '17:00:00' },
      { id: 0, dayOfWeek: 'FRIDAY', startTime: '09:00:00', endTime: '17:00:00' },
    ];
    onChange(standard);
  };

  const toggleDay = (day: DailyScheduleDto['dayOfWeek']) => {
    const existing = schedules.find((s) => s.dayOfWeek === day);
    if (existing) {
      onChange(schedules.filter((s) => s.dayOfWeek !== day));
    } else {
      onChange([...schedules, { id: 0, dayOfWeek: day, startTime: '09:00:00', endTime: '17:00:00' }]);
    }
  };

  const updateTime = (day: DailyScheduleDto['dayOfWeek'], field: 'startTime' | 'endTime', time: string) => {
    onChange(
      schedules.map((s) =>
        s.dayOfWeek === day
          ? { ...s, [field]: time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time }
          : s,
      ),
    );
  };

  const activeDays = new Set(schedules.map((s) => s.dayOfWeek));

  return (
    <div className="space-y-3">
      {schedules.length === 0 && (
        <button
          type="button"
          onClick={setStandardHours}
          className="w-full rounded border-2 border-form-accent bg-form-accent/10 px-3 py-2 text-sm font-medium text-form-accent transition-all hover:bg-form-accent/20"
        >
          Sett standard timer (Man-Fre 09:00-17:00)
        </button>
      )}

      <div className="max-h-80 space-y-3 overflow-y-auto rounded border border-form-border bg-form-bg p-3">
        {schedules.length === 0 ? (
          <p className="text-sm text-form-text-muted">{emptyText}</p>
        ) : (
          DAY_ORDER.filter((day) => activeDays.has(day)).map((day) => {
            const schedule = schedules.find((s) => s.dayOfWeek === day);
            if (!schedule) return null;

            const startTime = schedule.startTime.substring(0, 5);
            const endTime = schedule.endTime.substring(0, 5);

            return (
              <div key={day} className="space-y-2 rounded border-2 border-form-accent bg-form-accent/5 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-form-text">{DAY_LABELS[day]}</span>
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="text-xs text-form-text-muted hover:text-form-invalid transition-colors"
                  >
                    Fjern
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-form-text-muted">Fra</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => updateTime(day, 'startTime', e.target.value)}
                      className="w-full rounded border border-form-border bg-background px-2 py-1.5 text-sm text-form-text focus:outline-none focus:ring-1 focus:ring-form-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-form-text-muted">Til</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => updateTime(day, 'endTime', e.target.value)}
                      className="w-full rounded border border-form-border bg-background px-2 py-1.5 text-sm text-form-text focus:outline-none focus:ring-1 focus:ring-form-ring"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {schedules.length > 0 && activeDays.size < 7 && (
        <div className="space-y-2">
          <p className="text-xs text-form-text-muted">Legg til dag:</p>
          <div className="flex flex-wrap gap-2">
            {DAY_ORDER.filter((day) => !activeDays.has(day)).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className="rounded border border-form-border bg-background px-2.5 py-1 text-xs font-medium text-form-text transition-all hover:border-form-accent hover:bg-form-accent/5"
              >
                + {DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>
      )}

      {helperText && <p className="text-xs text-form-text-muted">{helperText}</p>}
    </div>
  );
};
