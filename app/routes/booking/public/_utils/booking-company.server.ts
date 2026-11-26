import { PublicCompanyController, type CompanySummaryDto } from '~/api/generated';

export async function getBookingCompanySummary(companyId: number, request: Request): Promise<CompanySummaryDto | null> {
  try {
    const response = await PublicCompanyController.publicGetCompanyById({
      path: {
        companyId,
      },
    });

    return response.data?.data ?? null;
  } catch {
    return null;
  }
}
