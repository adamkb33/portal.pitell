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
function findUnknownMergeFields(text: string): string[] {
  const known: readonly string[] = MERGE_FIELDS;
  return [...text.matchAll(MERGE_FIELD_PATTERN)].filter((match) => !known.includes(match[1])).map((match) => match[0]);
}

/** Required text with merge fields allowed: not blank, at most `max` characters, known merge fields only. */
export function mergeText(max: number, requiredMessage: string) {
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

export const campaignNameSchema = z
  .string('Skriv inn et navn.')
  .trim()
  .min(1, 'Skriv inn et navn.')
  .max(CAMPAIGN_LIMITS.name, `Maks ${CAMPAIGN_LIMITS.name} tegn.`);

export function parseJsonField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
