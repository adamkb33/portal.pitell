// ~/services/appointment-pagination.service.ts
import { addDays, endOfDay, endOfWeek, format, isSameDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatCurrentDateTimeInTimeZone, formatDateBoundaryInTimeZone, formatEndOfDayInTimeZone } from '~/lib/query';

export enum AppointmentPaginationQuickFilter {
  UPCOMING,
  PAST,
  TODAY,
  NEXT_7_DAYS,
  NEXT_30_DAYS,
  TOMORROW,
  THIS_WEEK,
}

export class AppointmentPaginationService {
  private searchParams: URLSearchParams;
  private navigate: (to: string, options?: { replace?: boolean }) => void;

  constructor(searchParams: URLSearchParams, navigate: (to: string, options?: { replace?: boolean }) => void) {
    this.searchParams = searchParams;
    this.navigate = navigate;
  }

  getActiveQuickFilter = (): AppointmentPaginationQuickFilter | null => {
    const fromDate = this.searchParams.get('fromDateTime');
    const toDate = this.searchParams.get('toDateTime');

    if (!fromDate && !toDate) return AppointmentPaginationQuickFilter.UPCOMING;

    if (fromDate && !toDate) {
      return AppointmentPaginationQuickFilter.UPCOMING;
    }

    if (!fromDate && toDate) {
      return AppointmentPaginationQuickFilter.PAST;
    }

    if (fromDate && toDate) {
      const timezone = 'Europe/Oslo';
      const now = toZonedTime(new Date(), timezone);

      const fromDt = toZonedTime(new Date(fromDate), timezone);
      const toDt = toZonedTime(new Date(toDate), timezone);

      // Check if toDate is end of day
      const toEndOfDay = endOfDay(toDt);
      const isToEndOfDay = Math.abs(toDt.getTime() - toEndOfDay.getTime()) < 1000; // Within 1 second

      if (isToEndOfDay) {
        const isFromToday = isSameDay(fromDt, now);
        const isToToday = isSameDay(toDt, now);

        // TODAY: both from and to are today
        if (isFromToday && isToToday) {
          return AppointmentPaginationQuickFilter.TODAY;
        }

        // TOMORROW: both from and to are tomorrow
        const tomorrow = addDays(now, 1);
        if (isSameDay(fromDt, tomorrow) && isSameDay(toDt, tomorrow)) {
          return AppointmentPaginationQuickFilter.TOMORROW;
        }

        // THIS_WEEK: from now to the end of this week (Sunday)
        if (isFromToday && isSameDay(toDt, endOfWeek(now, { weekStartsOn: 1 }))) {
          return AppointmentPaginationQuickFilter.THIS_WEEK;
        }

        // For NEXT_7_DAYS and NEXT_30_DAYS, from should be today
        if (isFromToday) {
          const daysDiff = Math.round((toDt.getTime() - fromDt.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff >= 7 && daysDiff <= 8) {
            return AppointmentPaginationQuickFilter.NEXT_7_DAYS;
          }

          if (daysDiff >= 30 && daysDiff <= 31) {
            return AppointmentPaginationQuickFilter.NEXT_30_DAYS;
          }
        }
      }
    }

    return null;
  };

  handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(this.searchParams);
    params.set('page', newPage.toString());
    this.navigate(`?${params.toString()}`, { replace: true });
  };

  handleSearchChange = (value: string) => {
    const params = new URLSearchParams(this.searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      params.set('search', trimmed);
    } else {
      params.delete('search');
    }
    params.set('page', '0');
    this.navigate(`?${params.toString()}`, { replace: true });
  };

  applyDateFilters = (fromDate: string, toDate: string) => {
    const params = new URLSearchParams(this.searchParams);

    if (fromDate) {
      params.set('fromDateTime', formatDateBoundaryInTimeZone(fromDate, 'start'));
    } else {
      params.delete('fromDateTime');
    }

    if (toDate) {
      params.set('toDateTime', formatDateBoundaryInTimeZone(toDate, 'end'));
    } else {
      params.delete('toDateTime');
    }
    params.set('page', '0');
    this.navigate(`?${params.toString()}`, { replace: true });
  };

  private handleQuickFilter = (from: string, to: string, direction?: 'ASC' | 'DESC') => {
    const params = new URLSearchParams(this.searchParams);

    if (from) {
      params.set('fromDateTime', from);
    } else {
      params.delete('fromDateTime');
    }

    if (to) {
      params.set('toDateTime', to);
    } else {
      params.delete('toDateTime');
    }
    if (direction) {
      params.set('direction', direction);
    } else {
      params.delete('direction');
    }

    params.set('page', '0');
    this.navigate(`?${params.toString()}`, { replace: true });
  };

  handleUpcomingFilter = () => {
    this.handleQuickFilter(formatCurrentDateTimeInTimeZone(), '');
  };

  handlePastFilter = () => {
    this.handleQuickFilter('', formatCurrentDateTimeInTimeZone(), 'DESC');
  };

  handleTodayFilter = () => {
    const timezone = 'Europe/Oslo';
    const nowInNorway = toZonedTime(new Date(), timezone);

    const startOfToday = formatCurrentDateTimeInTimeZone(timezone);
    const endOfToday = formatEndOfDayInTimeZone(nowInNorway, timezone);

    this.handleQuickFilter(startOfToday, endOfToday);
  };

  handleTomorrowFilter = () => {
    const timezone = 'Europe/Oslo';
    const tomorrow = addDays(toZonedTime(new Date(), timezone), 1);
    const startOfTomorrow = formatDateBoundaryInTimeZone(format(tomorrow, 'yyyy-MM-dd'), 'start', timezone);

    this.handleQuickFilter(startOfTomorrow, formatEndOfDayInTimeZone(tomorrow, timezone));
  };

  handleThisWeekFilter = () => {
    const timezone = 'Europe/Oslo';
    const nowInNorway = toZonedTime(new Date(), timezone);

    this.handleQuickFilter(
      formatCurrentDateTimeInTimeZone(timezone),
      formatEndOfDayInTimeZone(endOfWeek(nowInNorway, { weekStartsOn: 1 }), timezone),
    );
  };

  handleNext7days = () => {
    const timezone = 'Europe/Oslo';
    const nowInNorway = toZonedTime(new Date(), timezone);

    const startDate = formatCurrentDateTimeInTimeZone(timezone);
    const endDate = formatEndOfDayInTimeZone(addDays(nowInNorway, 7), timezone);

    this.handleQuickFilter(startDate, endDate);
  };

  handleNext30Days = () => {
    const timezone = 'Europe/Oslo';
    const nowInNorway = toZonedTime(new Date(), timezone);

    const startDate = formatCurrentDateTimeInTimeZone(timezone);
    const endDate = formatEndOfDayInTimeZone(addDays(nowInNorway, 30), timezone);

    this.handleQuickFilter(startDate, endDate);
  };

  handleClearFilters = () => {
    this.navigate('?', { replace: true });
  };

  handleRemoveDateRange = () => {
    const params = new URLSearchParams(this.searchParams);
    params.delete('fromDateTime');
    params.delete('toDateTime');
    params.set('page', '0');
    this.navigate(`?${params.toString()}`, { replace: true });
  };

  handleRemoveFilter = (filterType: 'search' | 'fromDate' | 'toDate') => {
    const params = new URLSearchParams(this.searchParams);

    switch (filterType) {
      case 'search':
        params.delete('search');
        break;
      case 'fromDate':
        params.delete('fromDateTime');
        break;
      case 'toDate':
        params.delete('toDateTime');
        break;
    }

    params.set('page', '0');
    this.navigate(`?${params.toString()}`, { replace: true });
  };
}
