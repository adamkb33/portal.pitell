import { PublicCompanyController, type CompanySummaryDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';

export async function getBookingCompanySummary(companyId: number, request: Request): Promise<CompanySummaryDto | null> {
  try {
    const response = await withAuth(request, () =>
      PublicCompanyController.publicGetCompanyById({
        path: {
          companyId,
        },
      }),
    );

    return response.data?.data ?? null;
  } catch {
    return null;
  }
}
