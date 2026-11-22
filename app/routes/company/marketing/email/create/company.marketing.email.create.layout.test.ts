import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireMarketingAdmin: vi.fn(),
  audienceCount: vi.fn(),
  recipients: vi.fn(),
  preview: vi.fn(),
  create: vi.fn(),
  withAuth: vi.fn(),
}));

vi.mock('../../company.marketing.layout', () => ({ loader: mocks.requireMarketingAdmin }));
vi.mock('~/api/generated', () => ({
  CompanyUserEmailCampaignController: { previewEmailCampaign: mocks.preview, createEmailCampaign: mocks.create },
  CompanyUserMarketingRecipientController: { recipients: mocks.recipients },
  CompanyUserMarketingCampaignController: {
    audienceCount: mocks.audienceCount,
  },
}));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: mocks.withAuth }));
vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: (error: { message?: string }, fallback: string) => ({ message: error?.message || fallback }),
}));

import { action, loader } from './company.marketing.email.create.layout';

const url = 'http://localhost/company/marketing/email/create';
const blocks = [
  { type: 'HEADING', text: 'God jul' },
  { type: 'BUTTON', text: 'Bestill', url: 'https://pitell.no' },
];

function post(fields: Record<string, string>) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  return action({ request: new Request(url, { method: 'POST', body }) } as never);
}

/** `data(...)` results carry the payload and the status separately. */
const unwrap = (result: unknown) => result as { data: Record<string, unknown>; init?: { status?: number } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireMarketingAdmin.mockResolvedValue(null);
  mocks.withAuth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
  mocks.audienceCount.mockImplementation(async ({ query }: { query: { channel: string } }) => ({
    data: { data: { eligibleCount: query.channel === 'EMAIL' ? 600 : 88 } },
  }));
  mocks.recipients.mockResolvedValue({ data: { data: [], meta: { pagination: { totalPages: 1 } } } });
  mocks.preview.mockResolvedValue({ data: { data: { html: '<p>Hei Ola</p>' } } });
  mocks.create.mockResolvedValue({ data: { data: { id: 42 } } });
});

describe('new campaign loader', () => {
  it('loads every recipient page for email selection', async () => {
    mocks.recipients
      .mockResolvedValueOnce({ data: { data: [{ userId: 1 }], meta: { pagination: { totalPages: 2 } } } })
      .mockResolvedValueOnce({ data: { data: [{ userId: 2 }] } });
    const result = await loader({ request: new Request(url) } as never);
    expect(result.customers.map((customer) => customer.userId)).toEqual([1, 2]);
    expect(mocks.recipients).toHaveBeenLastCalledWith({ query: { channel: 'EMAIL', page: 1, size: 100 } });
  });

  it('returns an error instead of throwing when the counts cannot be loaded', async () => {
    mocks.audienceCount.mockRejectedValue(new Error('Unavailable'));
    const result = await loader({ request: new Request(url) } as never);
    expect(result).toMatchObject({ recipients: null, error: 'Unavailable' });
  });
});

describe('new campaign action', () => {
  it('checks access before doing anything', async () => {
    mocks.requireMarketingAdmin.mockRejectedValue(new Response(null, { status: 302 }));
    await expect(post({ intent: 'send', subject: 'Hei', blocks: JSON.stringify(blocks) })).rejects.toMatchObject({
      status: 302,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('previews the email from structured blocks', async () => {
    const result = unwrap(await post({ intent: 'preview', subject: 'Hei', blocks: JSON.stringify(blocks) }));
    expect(mocks.preview).toHaveBeenCalledWith({ body: { subject: 'Hei', blocks } });
    expect(result.data).toEqual({ intent: 'preview', previewHtml: '<p>Hei Ola</p>', signature: '' });
  });

  it('does not call the backend for an invalid preview', async () => {
    const result = unwrap(await post({ intent: 'preview', subject: '', blocks: JSON.stringify(blocks) }));
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(result.data).toEqual({ intent: 'preview', previewHtml: null });
    expect(result.init?.status).toBe(400);
  });

  it('keeps quiet when the preview call fails', async () => {
    mocks.preview.mockRejectedValue(new Error('Ukjent flettefelt'));
    const result = unwrap(await post({ intent: 'preview', subject: 'Hei', blocks: JSON.stringify(blocks) }));
    expect(result.data).toEqual({ intent: 'preview', previewHtml: null });
  });

  it('creates and sends an email campaign, then opens its page', async () => {
    const result = await post({
      intent: 'send',
      name: 'Julekampanje',
      channel: 'EMAIL',
      subject: 'God jul',
      blocks: JSON.stringify(blocks),
      excludedUserIds: '[7]',
    });
    expect(mocks.create).toHaveBeenCalledWith({
      body: { subject: 'God jul', blocks, excludedUserIds: [7] },
    });
    expect(unwrap(result).data).toEqual({ intent: 'send', campaignId: 42 });
  });

  it('rejects an invalid campaign without calling the backend', async () => {
    const result = unwrap(await post({ intent: 'send', name: 'X', channel: 'EMAIL', subject: 'Hei', blocks: '[]' }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(result.init?.status).toBe(400);
  });

  it('shows the backend message when sending fails', async () => {
    mocks.create.mockRejectedValue(new Error('Ingen mottakere har gitt samtykke'));
    const result = unwrap(await post({ intent: 'send', subject: 'Fredag', blocks: JSON.stringify(blocks) }));
    expect(result.data).toEqual({ intent: 'send', error: 'Ingen mottakere har gitt samtykke' });
  });
});
