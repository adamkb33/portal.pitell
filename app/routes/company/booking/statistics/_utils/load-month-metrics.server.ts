import { CompanyUserBookingController, type BookingMonthMetrics } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { readMonth } from './month';

export type MonthMetricsResult = { metrics: BookingMonthMetrics; error: null } | { metrics: null; error: string };

/** The month from `?maned=` (or the current month) for every Statistikk page. */
export async function loadMonthMetrics(request: Request): Promise<MonthMetricsResult> {
  const month = readMonth(new URL(request.url));
  try {
    const response = await CompanyUserBookingController.getCompanyBookingMonthMetrics({
      query: month ? { month } : {},
    });
    const metrics = response.data?.data;
    if (!metrics) return { metrics: null, error: 'Kunne ikke hente statistikk' };
    return { metrics, error: null };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente statistikk');
    return { metrics: null, error: message };
  }
}
