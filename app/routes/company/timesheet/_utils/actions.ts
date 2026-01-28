import { redirect } from 'react-router';

export const redirectBackToCurrentPage = (request: Request) => {
  const url = new URL(request.url);
  return redirect(url.pathname + url.search);
};

export const normalizeNote = (value: FormDataEntryValue | null) => value?.toString().trim() || undefined;

export const parseNonNegativeInteger = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return 0;
  return Number.parseInt(value, 10);
};

export const parsePositiveFloat = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return Number.NaN;
  return Number.parseFloat(value);
};
