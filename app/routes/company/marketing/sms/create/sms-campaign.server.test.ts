import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ guard: vi.fn(), count: vi.fn(), create: vi.fn(), auth: vi.fn() }));
vi.mock('../../company.marketing.layout', () => ({ loader: mocks.guard }));
vi.mock('~/api/generated', () => ({
  CompanyUserMarketingCampaignController: { audienceCount: mocks.count },
  CompanyUserSmsCampaignController: { createSmsCampaign: mocks.create },
}));
vi.mock('~/api/utils/with-auth', () => ({ withAuth: mocks.auth }));
vi.mock('~/lib/api-error', () => ({ resolveErrorPayload: (error: Error) => ({ message: error.message }) }));
import { createSmsCampaign, loadSmsCampaignCreate } from './sms-campaign.server';
const url = 'http://localhost/company/marketing/sms/create';
const post = (fields: Record<string, string>) => {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));
  return createSmsCampaign(new Request(url, { method: 'POST', body }));
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockImplementation(async (_request: Request, callback: () => unknown) => callback());
  mocks.count.mockResolvedValue({ data: { data: { eligibleCount: 88 } } });
  mocks.create.mockResolvedValue({ data: { data: { id: 42 } } });
});
describe('SMS creation', () => {
  it('loads only the SMS audience after checking access', async () => {
    expect(await loadSmsCampaignCreate(new Request(url))).toEqual({
      recipients: 88,
      unsubscribeBaseUrl: 'http://localhost',
      error: null,
    });
    expect(mocks.guard).toHaveBeenCalledOnce();
    expect(mocks.count).toHaveBeenCalledWith({ query: { channel: 'SMS' } });
  });
  it('sends only SMS fields and redirects to history', async () => {
    const result = await post({ intent: 'send', name: 'Fredag', body: 'Hei', subject: 'Ignored', channel: 'EMAIL' });
    expect(mocks.create).toHaveBeenCalledWith({ body: { name: 'Fredag', body: 'Hei' } });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/company/marketing/42');
  });
  it('rejects preview and invalid message requests without sending', async () => {
    await post({ intent: 'preview', name: 'SMS', body: 'Hei' });
    await post({ intent: 'send', name: 'SMS', body: '' });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('checks access before sending', async () => {
    mocks.guard.mockRejectedValueOnce(new Response(null, { status: 403 }));
    await expect(post({ intent: 'send', name: 'SMS', body: 'Hei' })).rejects.toMatchObject({ status: 403 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('returns a send error when the backend rejects it', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Ingen mottakere'));
    const result = await post({ intent: 'send', name: 'SMS', body: 'Hei' });
    expect((result as { data: unknown }).data).toEqual({ error: 'Ingen mottakere' });
  });
});
