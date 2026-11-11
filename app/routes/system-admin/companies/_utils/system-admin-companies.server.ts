import { Base, type PaginatedResponseSystemAdminCompanyDto, type SystemAdminCompanyDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import {
  DEFAULT_COMPANY_OPTION_SIZE,
  DEFAULT_COMPANY_PAGE_SIZE,
  DEFAULT_COMPANY_SORT,
} from './system-admin-company-display';

export async function loadSystemAdminCompanies(
  request: Request,
  query: { page?: number; size?: number; sort?: string } = {},
): Promise<PaginatedResponseSystemAdminCompanyDto> {
  const response = await withAuth(request, () =>
    Base.listCompanies({
      query: {
        page: query.page ?? 0,
        size: query.size ?? DEFAULT_COMPANY_PAGE_SIZE,
        sort: query.sort ?? DEFAULT_COMPANY_SORT,
      },
    }),
  );

  return (
    response.data?.data ?? {
      content: [],
      page: query.page ?? 0,
      size: query.size ?? DEFAULT_COMPANY_PAGE_SIZE,
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    }
  );
}

export async function loadSystemAdminCompanyOptions(request: Request): Promise<SystemAdminCompanyDto[]> {
  const companies = await loadSystemAdminCompanies(request, {
    page: 0,
    size: DEFAULT_COMPANY_OPTION_SIZE,
    sort: DEFAULT_COMPANY_SORT,
  });

  return companies.content;
}
