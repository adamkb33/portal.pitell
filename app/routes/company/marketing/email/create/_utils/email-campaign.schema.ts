import { z } from 'zod';
import { CAMPAIGN_LIMITS, mergeText, parseJsonField } from '../../../_create/_schemas/content.schema';
export { CAMPAIGN_LIMITS } from '../../../_create/_schemas/content.schema';

const buttonUrl = z
  .string('Skriv inn en lenke.')
  .refine((value) => value.trim().length > 0, 'Skriv inn en lenke.')
  .refine((value) => !value.trim() || value.startsWith('https://'), 'Lenken må starte med https://')
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

export const emailPreviewSchema = z.object({ subject, blocks: emailBlocksSchema });

export const emailCampaignCreateSchema = z.object({
  subject,
  blocks: emailBlocksSchema,
  excludedUserIds: z.array(z.number().int().positive()).optional(),
});
export type EmailBlock = z.infer<typeof emailBlockSchema>;
export type EmailBlockType = EmailBlock['type'];
export type EmailPreviewInput = z.infer<typeof emailPreviewSchema>;
export type EmailCampaignCreateInput = z.infer<typeof emailCampaignCreateSchema>;

export function parseEmailCampaignForm(form: FormData) {
  return emailCampaignCreateSchema.safeParse({
    subject: form.get('subject') ?? undefined,
    blocks: parseJsonField(form.get('blocks')),
    ...(form.has('excludedUserIds') ? { excludedUserIds: parseJsonField(form.get('excludedUserIds')) } : {}),
  });
}
export function parseEmailPreviewForm(form: FormData) {
  return emailPreviewSchema.safeParse({
    subject: form.get('subject') ?? undefined,
    blocks: parseJsonField(form.get('blocks')),
  });
}
