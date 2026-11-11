import { z } from 'zod';

// Mirrors MarketingMessageRenderer.validateCampaign in the backend (marketing-service). Keep the two in step:
// the backend rejects anything this lets through with MARKETING_INVALID_CAMPAIGN or MARKETING_INVALID_MERGE_FIELD.

export const CAMPAIGN_LIMITS = {
  name: 120,
  subject: 150,
  heading: 200,
  paragraph: 5000,
  buttonLabel: 60,
  buttonUrl: 2000,
  smsBody: 300,
  blocks: 30,
} as const;

export const MERGE_FIELDS = ['givenName', 'familyName', 'companyName'] as const;

const MERGE_FIELD_PATTERN = /\{\{\s*([A-Za-z]+)\s*\}\}/g;

/** Merge fields the backend does not know, as written in the text (for example `{{firstName}}`). */
export function findUnknownMergeFields(text: string): string[] {
  const known: readonly string[] = MERGE_FIELDS;
  return [...text.matchAll(MERGE_FIELD_PATTERN)].filter((match) => !known.includes(match[1])).map((match) => match[0]);
}

/** Required text with merge fields allowed: not blank, at most `max` characters, known merge fields only. */
function mergeText(max: number, requiredMessage: string) {
  return z
    .string(requiredMessage)
    .refine((value) => value.trim().length > 0, requiredMessage)
    .refine((value) => value.length <= max, `Maks ${max} tegn.`)
    .superRefine((value, context) => {
      const unknown = findUnknownMergeFields(value);
      if (unknown.length > 0) {
        context.addIssue({ code: 'custom', message: `Ukjent flettefelt: ${unknown.join(', ')}` });
      }
    });
}

const buttonUrl = z
  .string('Skriv inn en lenke.')
  .refine((value) => value.startsWith('https://'), 'Lenken må starte med https://')
  .refine((value) => value.length <= CAMPAIGN_LIMITS.buttonUrl, `Maks ${CAMPAIGN_LIMITS.buttonUrl} tegn.`)
  .refine((value) => !/[\s"<>]/.test(value), 'Lenken kan ikke inneholde mellomrom, ", < eller >.')
  .refine((value) => !value.includes('{{'), 'Lenken kan ikke inneholde flettefelt.');

// Strict objects: a field a block type does not use must be absent, as the backend requires it to be null.
export const emailBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('HEADING'),
    text: mergeText(CAMPAIGN_LIMITS.heading, 'Skriv inn en overskrift.'),
  }),
  z.strictObject({
    type: z.literal('PARAGRAPH'),
    text: mergeText(CAMPAIGN_LIMITS.paragraph, 'Skriv inn tekst.'),
  }),
  z.strictObject({
    type: z.literal('BUTTON'),
    text: mergeText(CAMPAIGN_LIMITS.buttonLabel, 'Skriv inn knappetekst.'),
    url: buttonUrl,
  }),
  z.strictObject({
    type: z.literal('DIVIDER'),
  }),
]);

export const emailBlocksSchema = z
  .array(emailBlockSchema)
  .min(1, 'Legg til minst én blokk.')
  .max(CAMPAIGN_LIMITS.blocks, `Maks ${CAMPAIGN_LIMITS.blocks} blokker.`);

const subject = mergeText(CAMPAIGN_LIMITS.subject, 'Skriv inn et emne.');

const name = z
  .string('Skriv inn et navn.')
  .refine((value) => value.trim().length > 0, 'Skriv inn et navn.')
  .refine((value) => value.length <= CAMPAIGN_LIMITS.name, `Maks ${CAMPAIGN_LIMITS.name} tegn.`);

export const emailPreviewSchema = z.object({ subject, blocks: emailBlocksSchema });

export const campaignCreateSchema = z.discriminatedUnion(
  'channel',
  [
    z.object({ name, channel: z.literal('EMAIL'), subject, blocks: emailBlocksSchema }),
    z.object({ name, channel: z.literal('SMS'), body: mergeText(CAMPAIGN_LIMITS.smsBody, 'Skriv en melding.') }),
  ],
  { error: 'Velg kanal.' },
);

export type EmailBlock = z.infer<typeof emailBlockSchema>;
export type EmailBlockType = EmailBlock['type'];
export type EmailPreviewInput = z.infer<typeof emailPreviewSchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

/** The `blocks` hidden field holds `JSON.stringify(blocks)`; anything unparseable becomes `undefined` and fails validation. */
function parseBlocksField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Reads the new-campaign form. Only the fields of the chosen channel are passed on, so the result fits the API as is. */
export function parseCampaignForm(formData: FormData) {
  const channel = formData.get('channel');
  const base = { name: formData.get('name') ?? undefined, channel };
  return campaignCreateSchema.safeParse(
    channel === 'SMS'
      ? { ...base, body: formData.get('body') ?? undefined }
      : { ...base, subject: formData.get('subject') ?? undefined, blocks: parseBlocksField(formData.get('blocks')) },
  );
}

/** Reads the preview request (subject and blocks) from the same form. */
export function parsePreviewForm(formData: FormData) {
  return emailPreviewSchema.safeParse({
    subject: formData.get('subject') ?? undefined,
    blocks: parseBlocksField(formData.get('blocks')),
  });
}
