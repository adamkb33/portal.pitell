import { describe, expect, it } from 'vitest';
import { defaultEmailDraft, draftEmailBlocks } from './email-blocks';
import {
  checkDraft,
  hasOwnText,
  normalizeLink,
  previewBlocks,
  readDraft,
  startStep,
  stepAt,
  stepHref,
  switchTemplate,
} from './email-flow';

describe('Ny e-post steps', () => {
  it('starts a fresh e-mail by choosing a template, and a saved one where the writing is', () => {
    expect(startStep(defaultEmailDraft())).toBe('template');
    expect(startStep({ ...defaultEmailDraft(), subject: 'Julebooking' })).toBe('write');
    expect(startStep({ ...defaultEmailDraft(), message: 'Hei' })).toBe('write');
  });

  it('knows when changing template would throw text away', () => {
    expect(hasOwnText(defaultEmailDraft('promotion'))).toBe(false);
    expect(hasOwnText({ ...defaultEmailDraft('promotion'), message: 'Hei' })).toBe(true);
    expect(hasOwnText({ ...defaultEmailDraft(), buttonEnabled: true })).toBe(true);
  });

  it("says what is missing first, in the bar's words", () => {
    const empty = defaultEmailDraft();
    expect(checkDraft(empty).missing).toBe('Skriv inn et emne');
    expect(checkDraft({ ...empty, subject: 'Jul', heading: '' }).missing).toBe('Skriv inn en overskrift');
    expect(checkDraft({ ...empty, subject: 'Jul' }).missing).toBe('Skriv en melding');
    const withButton = { ...empty, subject: 'Jul', message: 'Hei', buttonEnabled: true };
    expect(checkDraft({ ...withButton, buttonUrl: 'http://pitell.no' }).missing).toBe('Lenken må starte med https://');
    expect(checkDraft({ ...withButton, buttonUrl: 'https://pitell.no' }).missing).toBeNull();
  });

  it('names what is wrong instead of asking for text that is there', () => {
    const ready = { ...defaultEmailDraft(), subject: 'Jul', message: 'Hei' };
    expect(checkDraft({ ...ready, subject: 'Hei {{fornavn}}' }).missing).toBe('Ukjent flettefelt: {{fornavn}}');
    expect(checkDraft({ ...ready, heading: 'Hei {{x}}' }).missing).toBe('Ukjent flettefelt: {{x}}');
    expect(checkDraft({ ...ready, subject: 'Hei {{givenName}}' }).missing).toBeNull();
    const withButton = { ...ready, buttonEnabled: true };
    expect(checkDraft({ ...withButton, buttonUrl: '' }).missing).toBe('Skriv inn en lenke');
    expect(checkDraft({ ...withButton, buttonLabel: '', buttonUrl: 'https://pitell.no' }).missing).toBe(
      'Skriv inn knappetekst',
    );
    expect(checkDraft({ ...withButton, buttonUrl: 'https://pitell .no' }).missing).toBe(
      'Lenken kan ikke inneholde mellomrom, ", < eller >',
    );
    expect(checkDraft({ ...withButton, buttonUrl: 'https://pitell.no/{{givenName}}' }).missing).toBe(
      'Lenken kan ikke inneholde flettefelt',
    );
  });

  it('opens a broken or missing saved draft as a fresh e-mail', () => {
    const saved = { ...defaultEmailDraft('promotion'), subject: 'Jul', excludedUserIds: [7] };
    expect(readDraft(JSON.stringify(saved))).toEqual(saved);
    expect(readDraft(null)).toEqual(defaultEmailDraft());
    expect(readDraft('{not json')).toEqual(defaultEmailDraft());
    expect(readDraft(JSON.stringify({ template: 'nope' }))).toEqual(defaultEmailDraft());
  });

  it('gives each step its own page', () => {
    expect(stepHref('template')).toBe('/company/marketing/email/create');
    expect(stepHref('write')).toBe('/company/marketing/email/create/write');
    expect(stepHref('send')).toBe('/company/marketing/email/create/send');
    expect(stepAt('/company/marketing/email/create')).toBe('template');
    expect(stepAt('/company/marketing/email/create/write/')).toBe('write');
    expect(stepAt('/company/marketing/email/create/send')).toBe('send');
  });

  it('changes template without throwing the text away', () => {
    const written = {
      ...defaultEmailDraft('announcement'),
      subject: 'Julebooking er åpen',
      message: 'Vi har åpent i romjulen.',
      buttonEnabled: true,
      buttonUrl: 'https://pitell.no',
    };
    // Untouched template text follows the new template; the user's own text stays.
    const promotion = switchTemplate(written, 'promotion');
    expect(promotion).toMatchObject({
      template: 'promotion',
      subject: 'Julebooking er åpen',
      message: 'Vi har åpent i romjulen.',
      heading: 'Et tilbud til deg',
      buttonEnabled: true,
      buttonLabel: 'Se tilbudet',
      buttonUrl: 'https://pitell.no',
    });
    // A heading the user wrote stays, also through Personlig melding (which hides it) and back.
    const ownHeading = { ...promotion, heading: 'Romjulsåpent', buttonLabel: 'Bestill time' };
    const personal = switchTemplate(ownHeading, 'personal');
    expect(personal).toMatchObject({ heading: 'Romjulsåpent', buttonLabel: 'Bestill time' });
    expect(draftEmailBlocks(personal).map((block) => block.type)).toEqual(['PARAGRAPH', 'BUTTON']);
    expect(switchTemplate(personal, 'announcement').heading).toBe('Romjulsåpent');
  });

  it('adds https:// to a link written without it', () => {
    expect(normalizeLink('pitell.no')).toBe('https://pitell.no');
    expect(normalizeLink('  www.pitell.no/booking ')).toBe('https://www.pitell.no/booking');
    expect(normalizeLink('https://pitell.no')).toBe('https://pitell.no');
    expect(normalizeLink('http://pitell.no')).toBe('http://pitell.no');
    expect(normalizeLink('')).toBe('');
  });

  it('previews what is finished and leaves out an unfinished button', () => {
    const draft = {
      ...defaultEmailDraft('announcement'),
      subject: 'Jul',
      message: 'Hei',
      buttonEnabled: true,
      buttonUrl: 'pitell',
    };
    expect(previewBlocks(draftEmailBlocks(draft)).map((block) => block.type)).toEqual(['HEADING', 'PARAGRAPH']);
  });
});
