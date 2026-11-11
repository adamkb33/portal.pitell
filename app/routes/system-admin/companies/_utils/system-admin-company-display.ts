import type { SystemAdminCompanyDto } from '~/api/generated';

export const DEFAULT_COMPANY_PAGE_SIZE = 10;
export const DEFAULT_COMPANY_OPTION_SIZE = 100;
export const DEFAULT_COMPANY_SORT = 'name,asc';

export function parsePositiveInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseNonNegativeInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function getCompanyDisplayName(company: SystemAdminCompanyDto): string {
  return company.name?.trim() || `Org.nr ${company.orgNum}`;
}

export function formatCompanyOptionLabel(company: SystemAdminCompanyDto): string {
  return `${getCompanyDisplayName(company)} (${company.orgNum})`;
}
