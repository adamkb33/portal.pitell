import { describe, expect, expectTypeOf, it } from 'vitest';
import type { SmsCampaignCreateRequest } from '~/api/generated';
import { smsCampaignCreateSchema, parseSmsCampaignForm, type SmsCampaignCreateInput } from './sms-campaign.schema';

describe('SMS campaign contract', () => {
  it('requires a name and a message within the backend limits', () => {
    expect(smsCampaignCreateSchema.safeParse({ name: 'a'.repeat(120), body: 'a'.repeat(300) }).success).toBe(true);
    for (const value of [
      { name: '', body: 'Hei' },
      { name: 'a'.repeat(121), body: 'Hei' },
      { name: 'SMS', body: '' },
      { name: 'SMS', body: 'a'.repeat(301) },
      { name: 'SMS', body: '{{unknown}}' },
    ])
      expect(smsCampaignCreateSchema.safeParse(value).success).toBe(false);
  });
  it('only submits SMS fields, even when email fields are supplied', () => {
    const form = new FormData();
    Object.entries({
      name: 'SMS',
      body: 'Hei {{givenName}}',
      subject: 'Email',
      blocks: '[]',
      channel: 'EMAIL',
    }).forEach(([key, value]) => form.set(key, value));
    expect(parseSmsCampaignForm(form).data).toEqual({ name: 'SMS', body: 'Hei {{givenName}}' });
    expectTypeOf<SmsCampaignCreateInput>().toExtend<SmsCampaignCreateRequest>();
  });
});
