import { z } from 'zod';
import { CAMPAIGN_LIMITS, emailBlockSchema, type EmailBlock, type EmailBlockType } from './email-campaign.schema';

/**
 * A block while it is being edited: every text field is a string, even while empty, and `id` keeps React's key (and
 * focus) on the block when it moves. `toEmailBlocks` drops the id before anything is sent.
 */
export type EditableBlock = { id: string } & (
  | { type: 'HEADING'; text: string }
  | { type: 'PARAGRAPH'; text: string }
  | { type: 'BUTTON'; text: string; url: string }
  | { type: 'DIVIDER' }
);

let lastBlockId = 0;
const nextBlockId = () => `block-${++lastBlockId}`;

export function createBlock(type: EmailBlockType): EditableBlock {
  const id = nextBlockId();
  switch (type) {
    case 'BUTTON':
      return { id, type, text: '', url: 'https://' };
    case 'DIVIDER':
      return { id, type };
    default:
      return { id, type, text: '' };
  }
}

/** A new email starts with one empty paragraph. */
export const initialBlocks = (): EditableBlock[] => [createBlock('PARAGRAPH')];

export const canAddBlock = (blocks: EditableBlock[]) => blocks.length < CAMPAIGN_LIMITS.blocks;

export function addBlock(blocks: EditableBlock[], type: EmailBlockType): EditableBlock[] {
  return canAddBlock(blocks) ? [...blocks, createBlock(type)] : blocks;
}

/** Moves the block at `index` one step up (-1) or down (1); a move past either end changes nothing. */
export function moveBlock(blocks: EditableBlock[], index: number, direction: -1 | 1): EditableBlock[] {
  const target = index + direction;
  if (index < 0 || index >= blocks.length || target < 0 || target >= blocks.length) return blocks;
  const next = [...blocks];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function removeBlock(blocks: EditableBlock[], index: number): EditableBlock[] {
  return blocks.filter((_, position) => position !== index);
}

export function updateBlock(
  blocks: EditableBlock[],
  index: number,
  changes: Partial<{ text: string; url: string }>,
): EditableBlock[] {
  return blocks.map((block, position) =>
    position === index && block.type !== 'DIVIDER' ? { ...block, ...changes } : block,
  );
}

/** The blocks as the API takes them (`{ type, text?, url? }`). */
export const toEmailBlocks = (blocks: EditableBlock[]) => blocks.map(({ id: _id, ...block }) => block);

/** The blocks that would pass validation right now, so the preview can update while another block is half-written. */
export const previewableBlocks = (blocks: EditableBlock[]): EmailBlock[] =>
  toEmailBlocks(blocks).flatMap((block) => {
    const parsed = emailBlockSchema.safeParse(block);
    return parsed.success ? [parsed.data] : [];
  });

export const EMAIL_TEMPLATES = {
  announcement: {
    label: 'Kunngjøring',
    subject: 'Nyheter fra selskapet',
    heading: 'Vi har nyheter',
    message: 'Fortell kundene hva som er nytt, og hva det betyr for dem.',
    button: 'Les mer',
  },
  promotion: {
    label: 'Tilbud',
    subject: 'Et tilbud til deg',
    heading: 'Et tilbud til deg',
    message: 'Beskriv tilbudet, eventuelle vilkår og når det slutter.',
    button: 'Se tilbudet',
  },
  personal: {
    label: 'Personlig melding',
    subject: 'En hilsen fra selskapet',
    heading: '',
    message: 'Skriv en personlig oppdatering eller hilsen til kundene dine.',
    button: 'Les mer',
  },
} as const;

export const emailDraftSchema = z.object({
  template: z.enum(['announcement', 'promotion', 'personal']),
  subject: z.string().max(CAMPAIGN_LIMITS.subject),
  heading: z.string().max(CAMPAIGN_LIMITS.heading),
  message: z.string().max(CAMPAIGN_LIMITS.paragraph),
  buttonEnabled: z.boolean(),
  buttonLabel: z.string().max(CAMPAIGN_LIMITS.buttonLabel),
  buttonUrl: z.string().max(CAMPAIGN_LIMITS.buttonUrl),
  excludedUserIds: z.array(z.number().int().positive()),
});
export type EmailDraft = z.infer<typeof emailDraftSchema>;
export type EmailTemplate = EmailDraft['template'];

export function defaultEmailDraft(template: EmailTemplate = 'announcement'): EmailDraft {
  return {
    template,
    subject: '',
    heading: EMAIL_TEMPLATES[template].heading,
    message: '',
    buttonEnabled: false,
    buttonLabel: EMAIL_TEMPLATES[template].button,
    buttonUrl: '',
    excludedUserIds: [],
  };
}

export function draftEmailBlocks(draft: EmailDraft): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  if (draft.template !== 'personal') blocks.push({ type: 'HEADING', text: draft.heading });
  blocks.push({ type: 'PARAGRAPH', text: draft.message });
  if (draft.buttonEnabled) blocks.push({ type: 'BUTTON', text: draft.buttonLabel, url: draft.buttonUrl });
  return blocks;
}
