import type { MERGE_FIELDS } from '../_schemas/campaign.create.schema';

type MergeField = (typeof MERGE_FIELDS)[number];

export const MERGE_FIELD_CHIPS: Array<{ field: MergeField; label: string }> = [
  { field: 'givenName', label: 'Fornavn' },
  { field: 'familyName', label: 'Etternavn' },
  { field: 'companyName', label: 'Selskap' },
];

/** Fields that accept merge fields carry this attribute, so the "Sett inn" chips know where to write. */
export const MERGE_FIELD_ATTRIBUTE = 'data-merge-field';

export type MergeFieldElement = HTMLInputElement | HTMLTextAreaElement;

export function isMergeFieldElement(element: EventTarget | null): element is MergeFieldElement {
  return (
    (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
    element.hasAttribute(MERGE_FIELD_ATTRIBUTE)
  );
}

/**
 * Writes `{{field}}` at the caret of a controlled input. It sets the DOM value and fires a native `input` event, so the
 * field's own React `onChange` updates the state as if the user had typed it. Nothing happens past `maxLength`.
 */
export function insertMergeField(element: MergeFieldElement, field: MergeField) {
  const token = `{{${field}}}`;
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const next = element.value.slice(0, start) + token + element.value.slice(end);
  if (element.maxLength > 0 && next.length > element.maxLength) return;

  const setValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
  setValue?.call(element, next);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.focus();
  element.setSelectionRange(start + token.length, start + token.length);
}

const MERGE_FIELD_PATTERN = /\{\{\s*([A-Za-z]+)\s*\}\}/g;

/** Fills known merge fields like the backend does for the preview; unknown ones stay as written. */
export function fillMergeFields(text: string, values: Record<MergeField, string>) {
  return text.replace(MERGE_FIELD_PATTERN, (match, name: string) =>
    name in values ? values[name as MergeField] : match,
  );
}
