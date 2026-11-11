import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CampaignCreateRequest, EmailPreviewRequest } from '~/api/generated';
import {
  CAMPAIGN_LIMITS,
  campaignCreateSchema,
  emailBlockSchema,
  emailBlocksSchema,
  findUnknownMergeFields,
  parseCampaignForm,
  parsePreviewForm,
  type CampaignCreateInput,
  type EmailPreviewInput,
} from './campaign.create.schema';

const text = (length: number) => 'a'.repeat(length);
const valid = (block: unknown) => emailBlockSchema.safeParse(block).success;
const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

const emailCampaign = {
  name: 'Høstkampanje',
  channel: 'EMAIL',
  subject: 'Hei {{givenName}}',
  blocks: [
    { type: 'HEADING', text: 'Velkommen tilbake' },
    { type: 'PARAGRAPH', text: 'Hei {{ givenName }},\nvi har ledige timer.' },
    { type: 'BUTTON', text: 'Bestill time', url: 'https://pitell.no/booking?companyId=1' },
    { type: 'DIVIDER' },
  ],
};

function form(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  return formData;
}

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

describe('merge fields', () => {
  it('finds only unknown merge fields', () => {
    expect(findUnknownMergeFields('Hei {{givenName}} {{ familyName }} fra {{companyName}}')).toEqual([]);
    expect(findUnknownMergeFields('Hei {{firstName}} og {{ email }}')).toEqual(['{{firstName}}', '{{ email }}']);
    // The backend only treats letters as a merge-field name, so these stay plain text.
    expect(findUnknownMergeFields('{{given_name}} {{}} {givenName}')).toEqual([]);
  });

  it('rejects unknown merge fields in the subject, block text, button labels and SMS body', () => {
    const unknown = 'Hei {{firstName}}';
    expect(valid({ type: 'HEADING', text: unknown })).toBe(false);
    expect(valid({ type: 'PARAGRAPH', text: unknown })).toBe(false);
    expect(valid({ type: 'BUTTON', text: unknown, url: 'https://a.no' })).toBe(false);

    const subject = campaignCreateSchema.safeParse({ ...emailCampaign, subject: unknown });
    expect(messages(subject)).toContain('Ukjent flettefelt: {{firstName}}');

    const sms = campaignCreateSchema.safeParse({ name: 'SMS', channel: 'SMS', body: unknown });
    expect(messages(sms)).toContain('Ukjent flettefelt: {{firstName}}');
  });
});

describe('campaign', () => {
  it('accepts a full email campaign', () => {
    expect(campaignCreateSchema.safeParse(emailCampaign).success).toBe(true);
  });

  it('limits the name and the subject', () => {
    expect(campaignCreateSchema.safeParse({ ...emailCampaign, name: text(CAMPAIGN_LIMITS.name) }).success).toBe(true);
    expect(campaignCreateSchema.safeParse({ ...emailCampaign, name: text(CAMPAIGN_LIMITS.name + 1) }).success).toBe(
      false,
    );
    expect(campaignCreateSchema.safeParse({ ...emailCampaign, name: '   ' }).success).toBe(false);
    expect(
      campaignCreateSchema.safeParse({ ...emailCampaign, subject: text(CAMPAIGN_LIMITS.subject + 1) }).success,
    ).toBe(false);
    expect(campaignCreateSchema.safeParse({ ...emailCampaign, subject: '' }).success).toBe(false);
  });

  it('limits an SMS to 300 characters', () => {
    const sms = (body: string) => campaignCreateSchema.safeParse({ name: 'SMS', channel: 'SMS', body }).success;
    expect(sms(text(CAMPAIGN_LIMITS.smsBody))).toBe(true);
    expect(sms(text(CAMPAIGN_LIMITS.smsBody + 1))).toBe(false);
    expect(sms(' ')).toBe(false);
  });

  it('never passes on fields of the other channel', () => {
    const email = campaignCreateSchema.parse({ ...emailCampaign, body: 'Hei' });
    expect(email).not.toHaveProperty('body');

    const sms = campaignCreateSchema.parse({ name: 'SMS', channel: 'SMS', body: 'Hei', subject: 'x', blocks: [] });
    expect(sms).toEqual({ name: 'SMS', channel: 'SMS', body: 'Hei' });
  });

  it('asks for a channel when none or an unknown one is chosen', () => {
    expect(messages(campaignCreateSchema.safeParse({ name: 'X' }))).toEqual(['Velg kanal.']);
    expect(messages(campaignCreateSchema.safeParse({ name: 'X', channel: 'PUSH' }))).toEqual(['Velg kanal.']);
  });

  it('produces exactly what the API accepts', () => {
    expectTypeOf<CampaignCreateInput>().toExtend<CampaignCreateRequest>();
    expectTypeOf<EmailPreviewInput>().toExtend<EmailPreviewRequest>();
  });
});

describe('form parsing', () => {
  it('reads an email campaign with its blocks from the hidden JSON field', () => {
    const result = parseCampaignForm(
      form({
        name: emailCampaign.name,
        channel: 'EMAIL',
        subject: emailCampaign.subject,
        blocks: JSON.stringify(emailCampaign.blocks),
        body: 'ignored',
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual(emailCampaign);
  });

  it('reads an SMS campaign and ignores the email fields', () => {
    const result = parseCampaignForm(
      form({ name: 'SMS', channel: 'SMS', body: 'Hei {{givenName}}', subject: 'x', blocks: '[]' }),
    );
    expect(result.data).toEqual({ name: 'SMS', channel: 'SMS', body: 'Hei {{givenName}}' });
  });

  it('fails on missing or malformed blocks instead of throwing', () => {
    const base = { name: 'E-post', channel: 'EMAIL', subject: 'Hei' };
    expect(parseCampaignForm(form(base)).success).toBe(false);
    expect(parseCampaignForm(form({ ...base, blocks: '{not json' })).success).toBe(false);
    expect(parseCampaignForm(form({ ...base, blocks: '"<p>html</p>"' })).success).toBe(false);
  });

  it('reads a preview request', () => {
    const blocks = JSON.stringify([{ type: 'PARAGRAPH', text: 'Hei' }]);
    expect(parsePreviewForm(form({ subject: 'Hei', blocks })).data).toEqual({
      subject: 'Hei',
      blocks: [{ type: 'PARAGRAPH', text: 'Hei' }],
    });
    expect(parsePreviewForm(form({ subject: '', blocks })).success).toBe(false);
  });
});
