import { formatOsloTime, osloDateParts } from '~/lib/oslo-time';

const DAYS_NO = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const DAYS_SHORT_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const MONTHS_NO = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];
const MONTHS_SHORT_NO = ['jan', 'feb', 'mars', 'apr', 'mai', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'des'];

export function formatNorwegianDateTime(dateTimeString: string): {
  dayName: string;
  date: string;
  time: string;
  full: string;
  short: string;
} {
  const { weekday, day, monthIndex, year } = osloDateParts(dateTimeString);
  const dayName = DAYS_NO[weekday];
  const month = MONTHS_NO[monthIndex];
  const time = formatOsloTime(dateTimeString);

  return {
    dayName,
    date: `${day}. ${month} ${year}`,
    time: `kl. ${time}`,
    full: `${dayName} ${day}. ${month} ${year} kl. ${time}`,
    short: `${DAYS_SHORT_NO[weekday]} ${day}. ${MONTHS_SHORT_NO[monthIndex]}, ${time}`,
  };
}
