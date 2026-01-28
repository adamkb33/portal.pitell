import type { GetTimesheetEntriesRequest, TimesheetDayEntryDto } from '~/api/generated/timesheet';
import { serializeQueryParams } from '~/lib/query';
import type { TimesheetStatus } from './status';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;
const DEFAULT_SORT_BY: GetTimesheetEntriesRequest['sortBy'] = 'date';
const DEFAULT_SORT_DIRECTION: GetTimesheetEntriesRequest['sortDirection'] = 'DESC';

const VALID_SEARCH_STATUSES: TimesheetStatus[] = ['SUBMITTED', 'ACCEPTED', 'DECLINED'];

const toApiStatuses = (statuses: TimesheetStatus[]): GetTimesheetEntriesRequest['statuses'] | undefined => {
  const mapped = statuses.filter((status): status is TimesheetDayEntryDto['status'] => Boolean(status));
  return mapped.length ? mapped : undefined;
};

export function serializeTimesheetQuery(request?: GetTimesheetEntriesRequest) {
  if (!request) {
    return '';
  }

  return serializeQueryParams({
    page: request.page,
    size: request.size,
    sortBy: request.sortBy,
    sortDirection: request.sortDirection,
    fromDate: request.fromDate,
    toDate: request.toDate,
    entryMode: request.entryMode,
    statuses: request.statuses,
  });
}

export const parseTimesheetListRequest = (url: URL) => {
  const pageCandidate = Number.parseInt(url.searchParams.get('page') || `${DEFAULT_PAGE}`, 10);
  const sizeCandidate = Number.parseInt(url.searchParams.get('size') || `${DEFAULT_SIZE}`, 10);
  const page = Number.isNaN(pageCandidate) ? DEFAULT_PAGE : Math.max(pageCandidate, 0);
  const size = Number.isNaN(sizeCandidate) ? DEFAULT_SIZE : Math.max(sizeCandidate, 1);
  const fromDate = url.searchParams.get('fromDate') || undefined;
  const toDate = url.searchParams.get('toDate') || undefined;
  const entryModeParam = url.searchParams.get('entryMode') as GetTimesheetEntriesRequest['entryMode'] | null;
  const sortBy = (url.searchParams.get('sortBy') as GetTimesheetEntriesRequest['sortBy']) || DEFAULT_SORT_BY;
  const sortDirectionParam = url.searchParams.get('sortDirection');
  const sortDirection: GetTimesheetEntriesRequest['sortDirection'] =
    sortDirectionParam === 'ASC' || sortDirectionParam === 'DESC' ? sortDirectionParam : DEFAULT_SORT_DIRECTION;

  const statusesFromSearch = [...url.searchParams.getAll('status'), ...url.searchParams.getAll('statuses')];
  const statuses = statusesFromSearch.filter((status): status is TimesheetStatus =>
    VALID_SEARCH_STATUSES.includes(status as TimesheetStatus),
  );

  const apiStatuses = toApiStatuses(statuses);

  const requestPayload: GetTimesheetEntriesRequest = {
    page,
    size,
    sortBy,
    sortDirection,
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(entryModeParam ? { entryMode: entryModeParam } : {}),
    ...(apiStatuses ? { statuses: apiStatuses } : {}),
  };

  return {
    page,
    size,
    requestPayload,
    statuses,
  };
};
