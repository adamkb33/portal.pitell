export const CALENDAR_START_HOUR = 6;
export const CALENDAR_END_HOUR = 22;
export const SLOT_HEIGHT_PX = 24;

export const HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, index) => CALENDAR_START_HOUR + index,
);
