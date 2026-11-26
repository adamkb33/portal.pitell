import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Design guardrails (ui-rules skill). The rules only hold if something fails when they're broken, so these scan the
 * source like a linter would. Strict for the booking domain (the blueprint); app-wide with a list of known
 * violations that may only shrink: fix a file, then remove it from its list.
 */

const APP = join(__dirname, '..');
const BOOKING = join(APP, 'routes/company/booking');

function sourceFiles(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter((file) => /\.(tsx?|jsx?)$/.test(file) && !/\.test\.[jt]sx?$/.test(file))
    .map((file) => join(dir, file));
}

function violations(files: string[], pattern: RegExp) {
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) => (pattern.test(line) ? [`${relative(APP, file)}:${index + 1}  ${line.trim()}`] : [])),
  );
}

describe('booking domain (blueprint) uses tokens and the shared system only', () => {
  const files = sourceFiles(BOOKING);

  it('has no hard-coded hex colors in Tailwind classes (use or add a token)', () => {
    expect(violations(files, /\[[^\]\s]*#[0-9a-fA-F]{3,8}[^\]\s]*\]/)).toEqual([]);
  });

  it('has no raw gray palette classes (use text-*, surface-*, border tokens)', () => {
    expect(violations(files, /\b(bg|text|border)-(gray|zinc|neutral|stone)-\d{2,3}\b/)).toEqual([]);
  });

  it('imports no legacy components from ~/ui/legacy', () => {
    expect(violations(files, /from ['"](~|@)\/ui\/legacy\//)).toEqual([]);
  });
});

describe('whole app', () => {
  const files = [...sourceFiles(join(APP, 'routes')), ...sourceFiles(join(APP, 'ui'))];
  const filesUsing = (pattern: RegExp) =>
    [...new Set(violations(files, pattern).map((hit) => hit.split(':')[0]))].sort();

  it('shows results as flash toasts, never sonner (no Toaster is mounted, so sonner toasts never show)', () => {
    const knownViolations: string[] = [];
    const using = filesUsing(/from ['"]sonner['"]/);
    expect(using).toEqual(knownViolations);
  });

  it('adds no new imports of the legacy ~/ui/legacy components', () => {
    const knownViolations: string[] = [];
    const using = filesUsing(/from ['"](~|@)\/ui\/legacy\//);
    expect(using).toEqual(knownViolations);
  });

  it('declares create actions on list pages only, never on a layout (only the page being shown counts)', () => {
    const layoutsDeclaring = filesUsing(/\bcreateAction\s*:/).filter((file) => file.endsWith('.layout.tsx'));
    expect(layoutsDeclaring).toEqual([]);
  });
});
