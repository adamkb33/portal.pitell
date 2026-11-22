import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignSummaryDto } from '~/api/generated';

const mocks = vi.hoisted(() => ({
  requireMarketingAdmin: vi.fn(),
  list: vi.fn(),
  recipients: vi.fn(),
}));

vi.mock('../company.marketing.layout', () => ({ loader: mocks.requireMarketingAdmin }));
vi.mock('~/api/generated', () => ({
  CompanyUserMarketingCampaignController: { list: mocks.list },
  CompanyUserMarketingRecipientController: { recipients: mocks.recipients },
}));
vi.mock('~/api/utils/with-auth', () => ({
  withAuth: async (_request: Request, callback: () => unknown) => callback(),
}));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (_error: unknown, fallback: string) => ({ message: fallback }),
}));

import { loadChannelCampaigns, loadChannelRecipients } from './channel-lists.server';
import { groupCampaignsByMonth } from './campaigns';

const request = (path: string) => new Request(`http://localhost${path}`);

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

const kari = {
  userId: 2,
  givenName: 'Kari',
  familyName: 'Nordmann',
  channels: [{ channel: 'SMS', address: '+4791234567', since: '2026-11-14T09:00:00+01:00' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMarketingAdmin.mockResolvedValue(null);
  mocks.list.mockResolvedValue({
    data: {
      data: [campaign(2, '2026-11-05T14:02:00+01:00')],
      meta: { pagination: { page: 1, size: 25, totalElements: 30, totalPages: 2 } },
    },
  });
  mocks.recipients.mockResolvedValue({
    data: { data: [kari], meta: { pagination: { page: 0, totalElements: 18, totalPages: 1 } } },
  });
});

describe("a channel's campaigns", () => {
  it("checks access, then loads that channel's page from the URL", async () => {
    const result = await loadChannelCampaigns(request('/company/marketing/email?page=1'), 'EMAIL');
    expect(mocks.requireMarketingAdmin).toHaveBeenCalledOnce();
    expect(mocks.list).toHaveBeenCalledWith({ query: { page: 1, size: 25, channel: 'EMAIL' } });
    expect(result).toEqual({
      campaigns: [expect.objectContaining({ id: 2 })],
      pagination: { page: 1, totalElements: 30, totalPages: 2 },
      error: null,
    });
  });

  it('does not load campaigns when the guard redirects', async () => {
    mocks.requireMarketingAdmin.mockRejectedValue(new Response(null, { status: 302 }));
    await expect(loadChannelCampaigns(request('/company/marketing/sms'), 'SMS')).rejects.toMatchObject({
      status: 302,
    });
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('falls back to the first page for a missing or invalid page number', async () => {
    await loadChannelCampaigns(request('/company/marketing/sms?page=-3'), 'SMS');
    await loadChannelCampaigns(request('/company/marketing/sms?page=abc'), 'SMS');
    expect(mocks.list).toHaveBeenNthCalledWith(1, { query: { page: 0, size: 25, channel: 'SMS' } });
    expect(mocks.list).toHaveBeenNthCalledWith(2, { query: { page: 0, size: 25, channel: 'SMS' } });
  });

  it('returns an error instead of throwing when the backend fails', async () => {
    mocks.list.mockRejectedValue(new Error('Unavailable'));
    await expect(loadChannelCampaigns(request('/company/marketing/email'), 'EMAIL')).resolves.toEqual({
      campaigns: [],
      pagination: { page: 0, totalElements: 0, totalPages: 1 },
      error: 'Kunne ikke hente kampanjer',
    });
  });
});

describe("a channel's recipients", () => {
  it('checks access, then loads the customers who said yes to that channel', async () => {
    const result = await loadChannelRecipients(request('/company/marketing/sms/recipients'), 'SMS');
    expect(mocks.requireMarketingAdmin).toHaveBeenCalledOnce();
    expect(mocks.recipients).toHaveBeenCalledWith({ query: { page: 0, size: 25, channel: 'SMS' } });
    expect(result).toEqual({
      recipients: [kari],
      pagination: { page: 0, totalElements: 18, totalPages: 1 },
      error: null,
    });
  });

  it('returns an error instead of throwing when the list fails', async () => {
    mocks.recipients.mockRejectedValue(new Error('Unavailable'));
    await expect(loadChannelRecipients(request('/company/marketing/email/recipients'), 'EMAIL')).resolves.toMatchObject(
      {
        recipients: [],
        error: 'Kunne ikke hente mottakere',
      },
    );
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
