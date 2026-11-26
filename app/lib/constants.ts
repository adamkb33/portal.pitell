import type { CompanyRole } from '~/api/clients/types';

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  ADMIN: 'Administrator',
  EMPLOYEE: 'Ansatt',
} as const;
