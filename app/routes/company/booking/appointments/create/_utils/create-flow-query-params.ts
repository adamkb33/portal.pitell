type CreateFlowQueryState = {
  userId: number | null;
  email: string;
  mobileNumber: string;
  givenName: string;
  familyName: string;
  serviceIds: number[];
  /** How many of each service when more than one (`antall=15:2`); a missing id means 1. */
  quantities: Record<number, number>;
  startTime: string;
};

const parsePositiveInt = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const parseServiceIdsParam = (value: string | null): number[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

/** "15:2,16:3" → { 15: 2, 16: 3 }; only quantities from 2 to 10 are kept. */
export const parseQuantitiesParam = (value: string | null): Record<number, number> => {
  const quantities: Record<number, number> = {};
  for (const part of (value ?? '').split(',')) {
    const [id, count] = part.split(':').map(Number);
    if (Number.isInteger(id) && id > 0 && Number.isInteger(count) && count >= 2 && count <= 10) quantities[id] = count;
  }
  return quantities;
};

export const serializeQuantitiesParam = (quantities: Record<number, number>, serviceIds: number[]): string =>
  serviceIds
    .filter((id) => (quantities[id] ?? 1) > 1)
    .map((id) => `${id}:${quantities[id]}`)
    .join(',');

export const serializeServiceIdsParam = (serviceIds: number[]): string => {
  return serviceIds.filter((id) => Number.isInteger(id) && id > 0).join(',');
};

export const parseCreateFlowQueryState = (searchParams: URLSearchParams): CreateFlowQueryState => {
  return {
    userId: parsePositiveInt(searchParams.get('userId')),
    email: searchParams.get('email') ?? '',
    mobileNumber: searchParams.get('mobileNumber') ?? '',
    givenName: searchParams.get('givenName') ?? '',
    familyName: searchParams.get('familyName') ?? '',
    serviceIds: parseServiceIdsParam(searchParams.get('serviceIds')),
    quantities: parseQuantitiesParam(searchParams.get('antall')),
    startTime: searchParams.get('startTime') ?? '',
  };
};

export const setQueryParam = (params: URLSearchParams, key: string, value: string | null | undefined) => {
  if (!value) {
    params.delete(key);
    return;
  }

  params.set(key, value);
};

export const withCreateFlowQueryState = (
  current: URLSearchParams,
  partial: Partial<CreateFlowQueryState>,
): URLSearchParams => {
  const next = new URLSearchParams(current);
  const currentState = parseCreateFlowQueryState(current);
  const merged: CreateFlowQueryState = { ...currentState, ...partial };

  if (merged.userId) {
    next.set('userId', String(merged.userId));
  } else {
    next.delete('userId');
  }

  setQueryParam(next, 'email', merged.email.trim() || null);
  setQueryParam(next, 'mobileNumber', merged.mobileNumber.trim() || null);
  setQueryParam(next, 'givenName', merged.givenName.trim() || null);
  setQueryParam(next, 'familyName', merged.familyName.trim() || null);
  setQueryParam(next, 'startTime', merged.startTime || null);

  const serviceIdsValue = serializeServiceIdsParam(merged.serviceIds);
  setQueryParam(next, 'serviceIds', serviceIdsValue || null);
  setQueryParam(next, 'antall', serializeQuantitiesParam(merged.quantities, merged.serviceIds) || null);

  return next;
};

export const parseListPageParam = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const parseListSizeParam = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};
