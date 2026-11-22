import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ recipients: vi.fn() }));

vi.mock('~/api/generated', () => ({
  CompanyUserMarketingRecipientController: { recipients: mocks.recipients },
}));
vi.mock('~/api/utils/with-auth', () => ({
  withAuth: async (_request: Request, callback: () => unknown) => callback(),
}));

import { countRecipients } from './counts.server';

const request = new Request('http://localhost/company/marketing');

beforeEach(() => vi.clearAllMocks());

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
