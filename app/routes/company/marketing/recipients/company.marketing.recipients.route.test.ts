import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireMarketingAdmin: vi.fn(),
  recipients: vi.fn(),
  countRecipients: vi.fn(),
}));

vi.mock('../company.marketing.layout', () => ({ loader: mocks.requireMarketingAdmin }));
vi.mock('~/api/generated', () => ({ CompanyUserMarketingRecipientController: { recipients: mocks.recipients } }));
vi.mock('~/api/utils/with-auth', () => ({
  withAuth: async (_request: Request, callback: () => unknown) => callback(),
}));
vi.mock('../_utils/counts.server', () => ({ countRecipients: mocks.countRecipients }));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (_error: unknown, fallback: string) => ({ message: fallback }),
}));

import { loader } from './company.marketing.recipients.route';

const load = (search = '') =>
  loader({ request: new Request(`http://localhost/company/marketing/mottakere${search}`) } as never);

const kari = {
  userId: 2,
  givenName: 'Kari',
  familyName: 'Nordmann',
  channels: [{ channel: 'SMS', address: '+4791234567', since: '2026-11-14T09:00:00+01:00' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMarketingAdmin.mockResolvedValue(null);
  mocks.recipients.mockResolvedValue({
    data: { data: [kari], meta: { pagination: { page: 1, totalElements: 21, totalPages: 2 } } },
  });
  mocks.countRecipients.mockImplementation(async (_request: Request, channel: string | null) =>
    channel === 'EMAIL' ? 29 : channel === 'SMS' ? 18 : 40,
  );
});

describe('recipients loader', () => {
  it('checks access, then reads the channel and page from the URL', async () => {
    const result = await load('?kanal=sms&page=1');
    expect(mocks.requireMarketingAdmin).toHaveBeenCalledOnce();
    expect(mocks.recipients).toHaveBeenCalledWith({ query: { page: 1, size: 25, channel: 'SMS' } });
    expect(result).toEqual({
      channel: 'SMS',
      recipients: [kari],
      pagination: { page: 1, totalElements: 21, totalPages: 2 },
      counts: { all: 40, EMAIL: 29, SMS: 18 },
      error: null,
    });
  });

  it('shows everyone without a channel or with an unknown one', async () => {
    await load('?kanal=fax');
    expect(mocks.recipients).toHaveBeenCalledWith({ query: { page: 0, size: 25 } });
  });

  it('does not load anything when the guard redirects', async () => {
    mocks.requireMarketingAdmin.mockRejectedValue(new Response(null, { status: 302 }));
    await expect(load()).rejects.toMatchObject({ status: 302 });
    expect(mocks.recipients).not.toHaveBeenCalled();
  });

  it('returns an error instead of throwing when the list fails', async () => {
    mocks.recipients.mockRejectedValue(new Error('Unavailable'));
    await expect(load()).resolves.toMatchObject({
      recipients: [],
      pagination: { page: 0, totalElements: 0, totalPages: 1 },
      error: 'Kunne ikke hente mottakere',
    });
  });
});
