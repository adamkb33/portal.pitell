type CreateFlowQueryState = {
  userId: number | null;
  email: string;
  mobileNumber: string;
  serviceIds: number[];
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

export const serializeServiceIdsParam = (serviceIds: number[]): string => {
  return serviceIds.filter((id) => Number.isInteger(id) && id > 0).join(',');
};

export const parseCreateFlowQueryState = (searchParams: URLSearchParams): CreateFlowQueryState => {
  return {
    userId: parsePositiveInt(searchParams.get('userId')),
    email: searchParams.get('email') ?? '',
    mobileNumber: searchParams.get('mobileNumber') ?? '',
    serviceIds: parseServiceIdsParam(searchParams.get('serviceIds')),
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
  setQueryParam(next, 'startTime', merged.startTime || null);

  const serviceIdsValue = serializeServiceIdsParam(merged.serviceIds);
  setQueryParam(next, 'serviceIds', serviceIdsValue || null);

  return next;
};

export const parseListPageParam = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const isDuplicateContactError = (error: unknown): boolean => {
  const errorPayload = error as {
    response?: {
      status?: number;
      data?: {
        message?: { id?: string; value?: string } | string;
        errors?: Array<{
          message?: { id?: string; value?: string } | string;
          details?: string;
        }>;
      };
    };
  };

  const status = errorPayload.response?.status;
  const payload = errorPayload.response?.data;
  const payloadMessage = payload?.message;
  const payloadMessageId =
    typeof payloadMessage === 'string' ? payloadMessage : (payloadMessage?.id ?? payloadMessage?.value ?? '');

  const hasConflictMessage =
    payloadMessageId === 'CONFLICT' ||
    payloadMessageId === 'DATA_INTEGRITY_VIOLATION' ||
    payload?.errors?.some((entry) => {
      const message = entry.message;
      const messageId = typeof message === 'string' ? message : (message?.id ?? message?.value ?? '');
      return messageId === 'CONFLICT' || messageId === 'DATA_INTEGRITY_VIOLATION';
    }) ||
    payload?.errors?.some((entry) => /exist|duplicate|already/i.test(entry.details ?? ''));

  return status === 409 || Boolean(hasConflictMessage);
};

