export type Weekday = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export type ScheduleWeekDay = {
  date: Date;
  key: string;
  dayOfWeek: Weekday;
  label: string;
  isToday: boolean;
  isPast: boolean;
};
