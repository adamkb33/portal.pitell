import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignSummaryDto } from '~/api/generated';

const mocks = vi.hoisted(() => ({
  requireMarketingAdmin: vi.fn(),
  list: vi.fn(),
  withAuth: vi.fn(),
}));

vi.mock('./company.marketing.layout', () => ({ loader: mocks.requireMarketingAdmin }));
vi.mock('~/api/generated', () => ({ CompanyUserMarketingCampaignController: { list: mocks.list } }));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: mocks.withAuth }));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (_error: unknown, fallback: string) => ({ message: fallback }),
}));

import { loader } from './company.marketing.route';
import { groupCampaignsByMonth } from './_utils/campaigns';

const load = (url = 'http://localhost/company/marketing') => loader({ request: new Request(url) } as never);

function campaign(id: number, startedAt: string): CampaignSummaryDto {
  return {
    id,
    name: `Kampanje ${id}`,
    channel: 'EMAIL',
    status: 'COMPLETED',
    startedAt,
    eligibleCount: 10,
    counts: { queued: 0, sent: 10, failed: 0, skipped: 0, unsubscribed: 0 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMarketingAdmin.mockResolvedValue(null);
  mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
  mocks.list.mockResolvedValue({
    data: {
      data: [campaign(2, '2026-11-05T14:02:00+01:00')],
      meta: { pagination: { page: 1, size: 10, totalElements: 11, totalPages: 2 } },
    },
  });
});

describe('campaign list loader', () => {
  it('checks access before loading and reads the page from the URL', async () => {
    const result = await load('http://localhost/company/marketing?page=1');
    expect(mocks.requireMarketingAdmin).toHaveBeenCalledOnce();
    expect(mocks.list).toHaveBeenCalledWith({ query: { page: 1, size: 10 } });
    expect(result).toEqual({
      campaigns: [expect.objectContaining({ id: 2 })],
      pagination: { page: 1, totalElements: 11, totalPages: 2 },
      error: null,
    });
  });

  it('does not load campaigns when the guard redirects', async () => {
    mocks.requireMarketingAdmin.mockRejectedValue(new Response(null, { status: 302 }));
    await expect(load()).rejects.toMatchObject({ status: 302 });
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('falls back to the first page for a missing or invalid page number', async () => {
    await load('http://localhost/company/marketing?page=-3');
    await load('http://localhost/company/marketing?page=abc');
    expect(mocks.list).toHaveBeenNthCalledWith(1, { query: { page: 0, size: 10 } });
    expect(mocks.list).toHaveBeenNthCalledWith(2, { query: { page: 0, size: 10 } });
  });

  it('returns an error instead of throwing when the backend fails', async () => {
    mocks.list.mockRejectedValue(new Error('Unavailable'));
    await expect(load()).resolves.toEqual({
      campaigns: [],
      pagination: { page: 0, totalElements: 0, totalPages: 1 },
      error: 'Kunne ikke hente kampanjer',
    });
  });
});

describe('groupCampaignsByMonth', () => {
  it('groups by start month in the order given, with a capitalised Norwegian month', () => {
    const groups = groupCampaignsByMonth([
      campaign(3, '2026-11-20T10:00:00+01:00'),
      campaign(2, '2026-11-02T09:15:00+01:00'),
      campaign(1, '2026-10-28T18:40:00+01:00'),
    ]);
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['November 2026', [3, 2]],
      ['Oktober 2026', [1]],
    ]);
  });
});
