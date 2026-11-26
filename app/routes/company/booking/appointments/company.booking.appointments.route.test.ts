import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAppointments: vi.fn(),
  resolveErrorPayload: vi.fn(),
  formatCurrentDateTimeInTimeZone: vi.fn(),
}));

vi.mock('~/api/generated', () => ({
  CompanyUserAppointmentController: {
    getAppointments: mocks.getAppointments,
  },
}));

vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: mocks.resolveErrorPayload,
}));

vi.mock('~/lib/query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/lib/query')>();
  return {
    ...actual,
    formatCurrentDateTimeInTimeZone: mocks.formatCurrentDateTimeInTimeZone,
  };
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAppointmentDetailHref, loader } from './company.booking.appointments.route';

// React Router passes the page address as `url` next to the raw request; these tests call the route directly.
const withUrl = <A extends { request: Request }>(args: A) => ({ ...args, url: new URL(args.request.url) });

const routeSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'company.booking.appointments.route.tsx'),
  'utf8',
);

function createRequest(url: string) {
  return new Request(url);
}

describe('company booking appointments list route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.formatCurrentDateTimeInTimeZone.mockReturnValue('2026-07-08T12:00:00+02:00');
    mocks.resolveErrorPayload.mockImplementation((error: { response?: { status?: number } }, fallback: string) => ({
      message: fallback,
      status: error?.response?.status,
    }));
    mocks.getAppointments.mockResolvedValue({
      data: {
        data: {
          content: [],
          page: 0,
          size: 25,
          totalElements: 0,
          totalPages: 1,
        },
      },
    });
  });

  it('loads the normal appointments list with default today filter when no appointmentId is present', async () => {
    await loader(
      withUrl({
        request: createRequest('https://portal.pitell.no/company/booking/appointments'),
      }) as never,
    );

    expect(mocks.getAppointments).toHaveBeenCalledWith({
      query: {
        page: 0,
        size: 25,
        fromDateTime: '2026-07-08T12:00:00+02:00',
        direction: 'ASC',
      },
    });
  });

  it('always loads 25 appointments per page, ignoring a size query param', async () => {
    await loader(
      withUrl({
        request: createRequest('https://portal.pitell.no/company/booking/appointments?size=50'),
      }) as never,
    );

    expect(mocks.getAppointments).toHaveBeenCalledWith({
      query: expect.objectContaining({ size: 25 }),
    });
  });

  it('does not perform query-param appointment detail loading from the list route', async () => {
    const result = await loader(
      withUrl({
        request: createRequest('https://portal.pitell.no/company/booking/appointments?appointmentId=123'),
      }) as never,
    );

    expect(mocks.getAppointments).toHaveBeenCalledOnce();
    expect(result.appointments).toEqual([]);
  });

  it('builds canonical appointment detail hrefs for row and card navigation', () => {
    expect(getAppointmentDetailHref(123)).toBe('/company/booking/appointments/123');
    expect(routeSource).toContain("ROUTES_MAP['company.booking.appointments.detail']");
    expect(routeSource).not.toContain('AppointmentDetailsDialog');
    expect(routeSource).not.toContain("nextParams.delete('appointmentId')");
  });
});
