import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignDetailDto } from '~/api/generated';

const mocks = vi.hoisted(() => ({
  requireMarketingAdmin: vi.fn(),
  get1: vi.fn(),
  messages: vi.fn(),
  preview: vi.fn(),
  cancel: vi.fn(),
  withAuth: vi.fn(),
}));

vi.mock('../company.marketing.layout', () => ({ loader: mocks.requireMarketingAdmin }));
vi.mock('~/api/generated', () => ({
  CompanyUserMarketingCampaignController: {
    get1: mocks.get1,
    messages: mocks.messages,
    preview: mocks.preview,
    cancel: mocks.cancel,
  },
}));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: mocks.withAuth }));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (error: { message?: string; status?: number }, fallback: string) => ({
    message: error?.message || fallback,
    status: error?.status,
  }),
}));

import { action, loader } from './company.marketing.detail.route';

const blocks = [{ type: 'HEADING' as const, text: 'God jul' }];
const emailCampaign: CampaignDetailDto = {
  id: 7,
  name: 'Julebooking',
  channel: 'EMAIL',
  status: 'SENDING',
  startedAt: '2026-11-05T16:56:00+01:00',
  eligibleCount: 29,
  counts: { queued: 20, sent: 9, failed: 0, skipped: 0, unsubscribed: 0 },
  subject: 'Book juleklippen',
  blocks,
};

const load = (url = 'http://localhost/company/marketing/7', campaignId = '7') =>
  loader({ request: new Request(url), params: { campaignId } } as never);

const post = (intent: string, campaignId = '7') => {
  const body = new FormData();
  body.set('intent', intent);
  return action({
    request: new Request(`http://localhost/company/marketing/${campaignId}`, { method: 'POST', body }),
    params: { campaignId },
  } as never) as Promise<{ data: { error: string | null }; init?: { status?: number } }>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMarketingAdmin.mockResolvedValue(null);
  mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
  mocks.get1.mockResolvedValue({ data: { data: emailCampaign } });
  mocks.messages.mockResolvedValue({
    data: {
      data: [{ id: 1, recipientName: 'Kari Hansen', recipientAddress: 'kunde1@example.com', status: 'SENT' }],
      meta: { pagination: { page: 0, size: 10, totalElements: 29, totalPages: 3 } },
    },
  });
  mocks.preview.mockResolvedValue({ data: { data: { html: '<p>God jul</p>' } } });
  mocks.cancel.mockResolvedValue({ data: { data: { ...emailCampaign, status: 'CANCELLED' } } });
});

describe('campaign detail loader', () => {
  it('loads the campaign, a page of recipients and the rendered email', async () => {
    const result = await load();
    expect(mocks.requireMarketingAdmin).toHaveBeenCalledOnce();
    expect(mocks.get1).toHaveBeenCalledWith({ path: { id: 7 } });
    expect(mocks.messages).toHaveBeenCalledWith({ path: { id: 7 }, query: { page: 0, size: 10 } });
    expect(mocks.preview).toHaveBeenCalledWith({ body: { subject: 'Book juleklippen', blocks } });
    expect(result).toMatchObject({
      campaign: { id: 7 },
      messages: [{ id: 1 }],
      pagination: { page: 0, totalElements: 29, totalPages: 3 },
      status: null,
      previewHtml: '<p>God jul</p>',
      notFound: false,
      error: null,
    });
  });

  it('filters recipients by a known status and ignores unknown ones', async () => {
    await load('http://localhost/company/marketing/7?status=FAILED&page=1');
    expect(mocks.messages).toHaveBeenLastCalledWith({
      path: { id: 7 },
      query: { page: 1, size: 10, status: 'FAILED' },
    });

    const result = await load('http://localhost/company/marketing/7?status=OPENED');
    expect(mocks.messages).toHaveBeenLastCalledWith({ path: { id: 7 }, query: { page: 0, size: 10 } });
    expect(result.status).toBeNull();
  });

  it('shows an SMS without asking for an email preview', async () => {
    mocks.get1.mockResolvedValue({
      data: { data: { ...emailCampaign, channel: 'SMS', subject: undefined, blocks: undefined, body: 'Hei' } },
    });
    const result = await load();
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(result.previewHtml).toBeNull();
  });

  it('still shows the campaign when the preview fails', async () => {
    mocks.preview.mockRejectedValue(new Error('Unavailable'));
    const result = await load();
    expect(result).toMatchObject({ campaign: { id: 7 }, previewHtml: null, error: null });
  });

  it('reports an unknown or foreign campaign as not found', async () => {
    expect(await load('http://localhost/company/marketing/abc', 'abc')).toMatchObject({ notFound: true });
    expect(mocks.get1).not.toHaveBeenCalled();

    mocks.get1.mockRejectedValue({ message: 'Ikke funnet', status: 404 });
    expect(await load()).toMatchObject({ campaign: null, notFound: true, error: null });
  });

  it('returns an error instead of throwing when the backend fails', async () => {
    mocks.get1.mockRejectedValue({ message: 'Unavailable', status: 503 });
    expect(await load()).toMatchObject({ campaign: null, notFound: false, error: 'Unavailable' });
  });
});

describe('campaign detail action', () => {
  it('cancels the campaign after checking access', async () => {
    const result = await post('cancel');
    expect(mocks.requireMarketingAdmin).toHaveBeenCalledOnce();
    expect(mocks.cancel).toHaveBeenCalledWith({ path: { id: 7 } });
    expect(result.data).toEqual({ error: null });
  });

  it('does not cancel when access is denied', async () => {
    mocks.requireMarketingAdmin.mockRejectedValue(new Response(null, { status: 302 }));
    await expect(post('cancel')).rejects.toMatchObject({ status: 302 });
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it('shows the backend message when the campaign can no longer be cancelled', async () => {
    mocks.cancel.mockRejectedValue({ message: 'Kampanjen kan ikke endres i denne statusen' });
    const result = await post('cancel');
    expect(result.data).toEqual({ error: 'Kampanjen kan ikke endres i denne statusen' });
    expect(result.init?.status).toBe(400);
  });

  it('rejects unknown intents', async () => {
    const result = await post('delete');
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(result.init?.status).toBe(400);
  });
});
