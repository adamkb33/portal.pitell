import { describe, expect, expectTypeOf, it } from 'vitest';
import type { EmailCampaignCreateRequest, EmailPreviewRequest } from '~/api/generated';
import {
  CAMPAIGN_LIMITS,
  emailBlockSchema,
  emailBlocksSchema,
  emailCampaignCreateSchema,
  parseEmailCampaignForm,
  parseEmailPreviewForm,
  type EmailCampaignCreateInput,
  type EmailPreviewInput,
} from './email-campaign.schema';
const text = (length: number) => 'a'.repeat(length);
const valid = (block: unknown) => emailBlockSchema.safeParse(block).success;
function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}
const blocks = [{ type: 'PARAGRAPH', text: 'Hei' }];
describe('email blocks', () => {
  it('accepts every block type at its limit', () => {
    expect(valid({ type: 'HEADING', text: text(CAMPAIGN_LIMITS.heading) })).toBe(true);
    expect(valid({ type: 'PARAGRAPH', text: text(CAMPAIGN_LIMITS.paragraph) })).toBe(true);
    expect(valid({ type: 'BUTTON', text: text(CAMPAIGN_LIMITS.buttonLabel), url: 'https://a.no' })).toBe(true);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: `https://${text(CAMPAIGN_LIMITS.buttonUrl - 8)}` })).toBe(true);
    expect(valid({ type: 'DIVIDER' })).toBe(true);
  });

  it('rejects text over the limit', () => {
    expect(valid({ type: 'HEADING', text: text(CAMPAIGN_LIMITS.heading + 1) })).toBe(false);
    expect(valid({ type: 'PARAGRAPH', text: text(CAMPAIGN_LIMITS.paragraph + 1) })).toBe(false);
    expect(valid({ type: 'BUTTON', text: text(CAMPAIGN_LIMITS.buttonLabel + 1), url: 'https://a.no' })).toBe(false);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: `https://${text(CAMPAIGN_LIMITS.buttonUrl - 7)}` })).toBe(false);
  });

  it('rejects missing, empty and whitespace-only text', () => {
    for (const type of ['HEADING', 'PARAGRAPH'] as const) {
      expect(valid({ type })).toBe(false);
      expect(valid({ type, text: '' })).toBe(false);
      expect(valid({ type, text: '  \n ' })).toBe(false);
    }
    expect(valid({ type: 'BUTTON', text: ' ', url: 'https://a.no' })).toBe(false);
  });

  it('allows newlines in paragraphs', () => {
    expect(valid({ type: 'PARAGRAPH', text: 'Linje 1\nLinje 2\r\nLinje 3' })).toBe(true);
  });

  it('only accepts https button links', () => {
    expect(valid({ type: 'BUTTON', text: 'Gå' })).toBe(false);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: '' })).toBe(false);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: 'http://pitell.no' })).toBe(false);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: 'javascript:alert(1)' })).toBe(false);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: 'HTTPS://pitell.no' })).toBe(false);
    expect(valid({ type: 'BUTTON', text: 'Gå', url: '//pitell.no' })).toBe(false);
  });

  it('rejects button links with whitespace, quotes, angle brackets or merge fields', () => {
    for (const url of [
      'https://pitell.no/a b',
      'https://pitell.no/\ta',
      'https://pitell.no/"x',
      'https://pitell.no/<x>',
      'https://pitell.no/?n={{givenName}}',
    ]) {
      expect(valid({ type: 'BUTTON', text: 'Gå', url }), url).toBe(false);
    }
  });

  it('rejects fields a block type does not use', () => {
    expect(valid({ type: 'HEADING', text: 'Hei', url: 'https://a.no' })).toBe(false);
    expect(valid({ type: 'PARAGRAPH', text: 'Hei', url: 'https://a.no' })).toBe(false);
    expect(valid({ type: 'DIVIDER', text: 'Hei' })).toBe(false);
    expect(valid({ type: 'DIVIDER', url: 'https://a.no' })).toBe(false);
  });

  it('rejects an unknown block type', () => {
    expect(valid({ type: 'IMAGE', url: 'https://a.no/x.png' })).toBe(false);
  });

  it('needs 1 to 30 blocks', () => {
    const divider = { type: 'DIVIDER' };
    expect(emailBlocksSchema.safeParse([]).success).toBe(false);
    expect(emailBlocksSchema.safeParse(Array(CAMPAIGN_LIMITS.blocks).fill(divider)).success).toBe(true);
    expect(emailBlocksSchema.safeParse(Array(CAMPAIGN_LIMITS.blocks + 1).fill(divider)).success).toBe(false);
  });
});

describe('email campaign contract', () => {
  it('uses only email fields, with subject required and no separate name or channel', () => {
    expect(
      emailCampaignCreateSchema.parse({ subject: 'Hei', blocks, body: 'SMS', channel: 'SMS', name: 'Ignored' }),
    ).toEqual({ subject: 'Hei', blocks });
    for (const subject of ['', ' ', text(151), '{{unknown}}'])
      expect(emailCampaignCreateSchema.safeParse({ subject, blocks }).success).toBe(false);
    expect(emailCampaignCreateSchema.safeParse({ subject: text(150), blocks }).success).toBe(true);
  });
  it('rejects unknown merge fields in every text block', () => {
    for (const type of ['HEADING', 'PARAGRAPH', 'BUTTON'])
      expect(valid({ type, text: '{{unknown}}', ...(type === 'BUTTON' ? { url: 'https://pitell.no' } : {}) })).toBe(
        false,
      );
  });
  it('parses structured blocks and exclusions without accepting SMS fields', () => {
    expect(
      parseEmailCampaignForm(
        form({ subject: 'Hei', blocks: JSON.stringify(blocks), excludedUserIds: '[7]', body: 'SMS' }),
      ).data,
    ).toEqual({ subject: 'Hei', blocks, excludedUserIds: [7] });
    for (const raw of ['{bad', '[]', '"html"'])
      expect(parseEmailCampaignForm(form({ subject: 'Hei', blocks: raw })).success).toBe(false);
    expect(
      parseEmailCampaignForm(form({ subject: 'Hei', blocks: JSON.stringify(blocks), excludedUserIds: '[-1]' })).success,
    ).toBe(false);
  });
  it('parses the email preview request', () => {
    expect(parseEmailPreviewForm(form({ subject: 'Hei', blocks: JSON.stringify(blocks) })).data).toEqual({
      subject: 'Hei',
      blocks,
    });
    expectTypeOf<EmailCampaignCreateInput>().toExtend<EmailCampaignCreateRequest>();
    expectTypeOf<EmailPreviewInput>().toExtend<EmailPreviewRequest>();
  });
});
