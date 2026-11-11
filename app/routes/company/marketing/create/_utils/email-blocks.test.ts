import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LIMITS, emailBlocksSchema } from '../_schemas/campaign.create.schema';
import {
  addBlock,
  canAddBlock,
  createBlock,
  initialBlocks,
  moveBlock,
  previewableBlocks,
  removeBlock,
  toEmailBlocks,
  updateBlock,
  type EditableBlock,
} from './email-blocks';

const heading: EditableBlock = { id: 'h', type: 'HEADING', text: 'Overskrift' };
const paragraph: EditableBlock = { id: 'p', type: 'PARAGRAPH', text: 'Avsnitt' };
const button: EditableBlock = { id: 'b', type: 'BUTTON', text: 'Bestill', url: 'https://pitell.no' };
const divider: EditableBlock = { id: 'd', type: 'DIVIDER' };
const ids = (blocks: EditableBlock[]) => blocks.map((block) => block.id);

describe('email block editor operations', () => {
  it('starts with one empty paragraph', () => {
    expect(toEmailBlocks(initialBlocks())).toEqual([{ type: 'PARAGRAPH', text: '' }]);
  });

  it('creates blocks with only the fields their type uses, each with its own id', () => {
    expect(toEmailBlocks([createBlock('HEADING')])).toEqual([{ type: 'HEADING', text: '' }]);
    expect(toEmailBlocks([createBlock('BUTTON')])).toEqual([{ type: 'BUTTON', text: '', url: 'https://' }]);
    expect(toEmailBlocks([createBlock('DIVIDER')])).toEqual([{ type: 'DIVIDER' }]);
    expect(createBlock('DIVIDER').id).not.toBe(createBlock('DIVIDER').id);
  });

  it('appends a block of the chosen type', () => {
    const blocks = addBlock([heading], 'DIVIDER');
    expect(toEmailBlocks(blocks)).toEqual([{ type: 'HEADING', text: 'Overskrift' }, { type: 'DIVIDER' }]);
  });

  it('stops adding at 30 blocks', () => {
    const full = Array.from({ length: CAMPAIGN_LIMITS.blocks }, () => createBlock('DIVIDER'));
    expect(canAddBlock(full)).toBe(false);
    expect(canAddBlock(full.slice(1))).toBe(true);
    expect(addBlock(full, 'HEADING')).toBe(full);
  });

  it('moves a block up and down, keeping its id', () => {
    const blocks = [heading, paragraph, button];
    expect(ids(moveBlock(blocks, 1, -1))).toEqual(['p', 'h', 'b']);
    expect(ids(moveBlock(blocks, 1, 1))).toEqual(['h', 'b', 'p']);
    expect(ids(blocks)).toEqual(['h', 'p', 'b']);
  });

  it('does not move the first block up or the last block down', () => {
    const blocks = [heading, paragraph];
    expect(moveBlock(blocks, 0, -1)).toBe(blocks);
    expect(moveBlock(blocks, 1, 1)).toBe(blocks);
  });

  it('deletes a block', () => {
    expect(ids(removeBlock([heading, paragraph, button], 1))).toEqual(['h', 'b']);
  });

  it('edits text and links but never gives a divider fields', () => {
    expect(updateBlock([heading, button], 1, { url: 'https://a.no' })).toEqual([
      heading,
      { ...button, url: 'https://a.no' },
    ]);
    expect(updateBlock([divider], 0, { text: 'x' })).toEqual([divider]);
  });

  it('drops the ids so the result passes the API schema', () => {
    expect(emailBlocksSchema.safeParse(toEmailBlocks([heading, paragraph, button, divider])).success).toBe(true);
  });

  it('previews only the blocks that are valid so far', () => {
    const halfWritten = [heading, createBlock('PARAGRAPH'), createBlock('BUTTON'), divider];
    expect(previewableBlocks(halfWritten)).toEqual([{ type: 'HEADING', text: 'Overskrift' }, { type: 'DIVIDER' }]);
  });
});
