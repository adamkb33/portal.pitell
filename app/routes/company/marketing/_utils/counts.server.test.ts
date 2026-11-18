import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ list: vi.fn(), recipients: vi.fn() }));

vi.mock('~/api/generated', () => ({
  CompanyUserMarketingCampaignController: { list: mocks.list },
  CompanyUserMarketingRecipientController: { recipients: mocks.recipients },
}));
vi.mock('~/api/utils/with-auth', () => ({
  withAuth: async (_request: Request, callback: () => unknown) => callback(),
}));

import { countCampaignsThisMonth, countRecipients } from './counts.server';

const request = new Request('http://localhost/company/marketing');
const now = new Date('2026-11-18T12:00:00+01:00');
const started = (startedAt: string) => ({ startedAt });
const page = (startedAts: string[], totalPages: number) => ({
  data: { data: startedAts.map(started), meta: { pagination: { totalPages } } },
});

beforeEach(() => vi.clearAllMocks());

describe('countCampaignsThisMonth', () => {
  it('counts the newest campaigns until the first one from an earlier month', async () => {
    mocks.list.mockResolvedValueOnce(
      page(['2026-11-17T17:01:00+01:00', '2026-11-08T10:15:00+01:00', '2026-10-20T10:15:00+02:00'], 1),
    );
    await expect(countCampaignsThisMonth(request, now)).resolves.toBe(2);
    expect(mocks.list).toHaveBeenCalledOnce();
  });

  it('reads the next page when the whole first page is from this month', async () => {
    mocks.list
      .mockResolvedValueOnce(page(['2026-11-17T17:01:00+01:00', '2026-11-16T10:00:00+01:00'], 2))
      .mockResolvedValueOnce(page(['2026-11-01T00:30:00+01:00', '2026-10-31T23:30:00+01:00'], 2));
    await expect(countCampaignsThisMonth(request, now)).resolves.toBe(3);
    expect(mocks.list).toHaveBeenNthCalledWith(2, { query: { page: 1, size: 50 } });
  });

  it('uses the month in Oslo, not UTC', async () => {
    // 1 November 00:30 in Oslo is still 31 October in UTC.
    mocks.list.mockResolvedValueOnce(page(['2026-10-31T23:30:00Z'], 1));
    await expect(countCampaignsThisMonth(request, now)).resolves.toBe(1);
  });

  it('is null when the campaigns cannot be loaded', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(countCampaignsThisMonth(request, now)).resolves.toBeNull();
  });
});

describe('countRecipients', () => {
  it("is the recipients list's total, for everyone or one channel", async () => {
    mocks.recipients.mockResolvedValue({ data: { data: [], meta: { pagination: { totalElements: 29 } } } });
    await expect(countRecipients(request, 'EMAIL')).resolves.toBe(29);
    expect(mocks.recipients).toHaveBeenCalledWith({ query: { page: 0, size: 1, channel: 'EMAIL' } });
    await countRecipients(request, null);
    expect(mocks.recipients).toHaveBeenLastCalledWith({ query: { page: 0, size: 1 } });
  });

  it('is null when the recipients cannot be loaded', async () => {
    mocks.recipients.mockRejectedValue(new Error('Unavailable'));
    await expect(countRecipients(request, null)).resolves.toBeNull();
  });
});
