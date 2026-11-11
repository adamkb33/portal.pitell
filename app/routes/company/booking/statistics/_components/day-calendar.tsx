import { cn } from '~/ui';
import { monthName, plural } from '../_utils/month';

const WEEKDAYS = [
  { short: 'man', long: 'mandag' },
  { short: 'tir', long: 'tirsdag' },
  { short: 'ons', long: 'onsdag' },
  { short: 'tor', long: 'torsdag' },
  { short: 'fre', long: 'fredag' },
  { short: 'lør', long: 'lørdag' },
  { short: 'søn', long: 'søndag' },
];

/** Today in Oslo as "yyyy-MM-dd". */
export function osloToday(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(now);
}

/**
 * The shade for a day's count. Fixed steps rather than a share of the busiest day, so one very busy day doesn't
 * make the rest of the month look empty. Ink text on the light steps, white on the dark one (both ≥ 4.5:1).
 */
export function dayLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  'bg-slate-100 text-text-secondary',
  'bg-category-plum-tint text-text-primary',
  'bg-category-plum/35 text-text-primary',
  'bg-category-plum/60 text-text-primary',
  'bg-category-plum text-white',
] as const;

type Day = { date: string; count: number };

/** Monday-first weeks for the month, with null where a week starts before day 1 or ends after the last day. */
export function calendarWeeks(days: Day[]): (Day | null)[][] {
  if (days.length === 0) return [];
  const [year, month] = days[0].date.split('-').map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // 0 = Monday
  const cells: (Day | null)[] = [...Array<null>(firstWeekday).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/**
 * Avtaler per dag as a month calendar: each day shows its date and its count, shaded by how busy it was. Days after
 * today are booked, not done, so they get a dashed outline instead of a shade.
 */
export function DayCalendar({ days, month, today }: { days: Day[]; month: string; today: string }) {
  const name = monthName(month);

  return (
    <div className="px-3 pb-3 pt-2.5 sm:px-5 sm:pb-4">
      <table className="w-full table-fixed border-separate border-spacing-1">
        <caption className="sr-only">Avtaler per dag i {name}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th
                key={weekday.short}
                scope="col"
                abbr={weekday.long}
                className="pb-0.5 text-[11px] font-normal text-text-secondary"
              >
                {weekday.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks(days).map((week, index) => (
            <tr key={index}>
              {week.map((day, weekday) =>
                day ? (
                  <DayCell key={day.date} day={day} monthName={name} today={today} weekday={weekday} />
                ) : (
                  <td key={`empty-${weekday}`} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          Færre
          <span aria-hidden className="flex gap-0.5">
            {[1, 2, 3, 4].map((level) => (
              <span key={level} className={cn('size-3 rounded-[3px]', LEVEL_CLASSES[level])} />
            ))}
          </span>
          Flere
        </span>
        {days.some((day) => day.date > today) ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[3px] border border-dashed border-category-plum/50" />
            Booket
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DayCell({ day, monthName, today, weekday }: { day: Day; monthName: string; today: string; weekday: number }) {
  const dayNumber = Number(day.date.slice(8, 10));
  const booked = day.date > today;
  const isToday = day.date === today;
  const label = `${WEEKDAYS[weekday].long} ${dayNumber}. ${monthName}: ${day.count === 0 ? 'ingen avtaler' : plural(day.count, 'avtale', 'avtaler')}${booked && day.count > 0 ? ', booket' : ''}${isToday ? ', i dag' : ''}`;

  return (
    <td
      className={cn(
        'h-13 rounded-lg px-1.5 py-1 align-top text-[11px] sm:h-16 sm:px-2.5 sm:py-1.5 sm:text-xs',
        booked && day.count > 0
          ? 'border border-dashed border-category-plum/50 bg-background text-text-primary'
          : LEVEL_CLASSES[dayLevel(day.count)],
        isToday && 'outline-2 outline-offset-1 outline-interactive',
      )}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden className="flex h-full flex-col justify-between">
        <span>{dayNumber}</span>
        <span
          className={cn(
            'text-right tabular-nums',
            day.count === 0 ? 'text-[13px]' : 'text-[17px] font-bold leading-none sm:text-xl',
          )}
        >
          {day.count === 0 ? '–' : day.count}
        </span>
      </span>
    </td>
  );
}
