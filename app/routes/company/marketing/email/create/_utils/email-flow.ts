import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  EMAIL_TEMPLATES,
  defaultEmailDraft,
  draftEmailBlocks,
  emailDraftSchema,
  type EmailDraft,
  type EmailTemplate,
} from './email-blocks';
import { emailBlockSchema, emailCampaignCreateSchema, type EmailBlock } from './email-campaign.schema';

/** Ny e-post in three steps (approved sketch 2026-11-19): Mal → Skriv → Send. */
export type EmailStep = 'template' | 'write' | 'send';

export const EMAIL_STEPS: Array<{ id: EmailStep; label: string }> = [
  { id: 'template', label: 'Velg mal' },
  { id: 'write', label: 'Skriv e-posten' },
  { id: 'send', label: 'Se over og send' },
];

/** Each step is its own route under Ny e-post (Mal is the index), so back goes one step back. */
const STEP_ROUTE_IDS: Record<EmailStep, string> = {
  template: 'company.marketing.email.create',
  write: 'company.marketing.email.create.write',
  send: 'company.marketing.email.create.send',
};

export function stepHref(step: EmailStep): string {
  return ROUTES_MAP[STEP_ROUTE_IDS[step]].href;
}

export function stepAt(pathname: string): EmailStep {
  const path = pathname.replace(/\/+$/, '');
  return EMAIL_STEPS.find((step) => stepHref(step.id) === path)?.id ?? 'template';
}

/** The unfinished e-mail saved in this browser; anything unreadable is a fresh e-mail. */
export function readDraft(raw: string | null): EmailDraft {
  if (!raw) return defaultEmailDraft();
  try {
    const result = emailDraftSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : defaultEmailDraft();
  } catch {
    return defaultEmailDraft();
  }
}

/** Whether the user has written anything of their own (the template list then marks the template in use). */
export function hasOwnText(draft: EmailDraft): boolean {
  const defaults = defaultEmailDraft(draft.template);
  return (
    draft.subject !== defaults.subject ||
    draft.heading !== defaults.heading ||
    draft.message !== defaults.message ||
    draft.buttonEnabled ||
    draft.buttonLabel !== defaults.buttonLabel ||
    draft.buttonUrl !== defaults.buttonUrl
  );
}

/** A saved draft opens where the writing is; a fresh one starts by choosing a template. */
export function startStep(draft: EmailDraft): EmailStep {
  return draft.subject.trim() || draft.message.trim() ? 'write' : 'template';
}

/**
 * Changing template never throws text away, so it needs no question (decided 2026-11-19). The subject, the message
 * and the button are the user's and stay. Only what the template itself filled in follows the new template: the
 * heading and the button text, and only while the user hasn't changed them. Personlig melding has no heading; the
 * heading stays in the draft, so switching back brings it back.
 */
export function switchTemplate(draft: EmailDraft, next: EmailTemplate): EmailDraft {
  const from = EMAIL_TEMPLATES[draft.template];
  const to = EMAIL_TEMPLATES[next];
  return {
    ...draft,
    template: next,
    heading: draft.heading === from.heading ? to.heading : draft.heading,
    buttonLabel: draft.buttonLabel === from.button ? to.button : draft.buttonLabel,
  };
}

/** "pitell.no" → "https://pitell.no": most people don't type the scheme. A link with one is left as written. */
export function normalizeLink(value: string): string {
  const link = value.trim();
  if (!link || /^[a-z][a-z0-9+.-]*:\/\//i.test(link)) return link;
  return `https://${link}`;
}

/**
 * The blocks the preview can show right now: the ones that are already valid. An unfinished button (a link without
 * https://, say) is left out until it is ready, instead of hiding the whole e-mail.
 */
export function previewBlocks(blocks: EmailBlock[]): EmailBlock[] {
  return blocks.filter((block) => emailBlockSchema.safeParse(block).success);
}

/**
 * The e-mail as it will be sent, and the one line saying what's missing first (null when it can be sent).
 */
export function checkDraft(draft: EmailDraft): { blocks: EmailBlock[]; missing: string | null } {
  const blocks = draftEmailBlocks(draft);
  const result = emailCampaignCreateSchema.safeParse({
    subject: draft.subject,
    blocks,
    excludedUserIds: draft.excludedUserIds,
  });
  return { blocks, missing: result.success ? null : missingMessage(result.error.issues) };
}

/**
 * The one line under "Velg mottakere" saying what's missing first (ui-rules, rule 5): the schema's own message without
 * the full stop, so a bad merge field or link says what is wrong instead of "Skriv inn …".
 */
function missingMessage(issues: Array<{ message: string }>): string | null {
  const message = issues[0]?.message.replace(/\.$/, '');
  if (!message) return null;
  return message === 'Skriv inn tekst' ? 'Skriv en melding' : message;
}
