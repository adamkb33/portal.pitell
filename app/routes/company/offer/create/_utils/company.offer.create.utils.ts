import type { OfferTemplateDto, OfferTemplateFieldDto, ReplaceOfferLineRequest } from '~/api/generated';
import type {
  CreateOfferValues,
  TemplateFieldValue,
  LineFormRow,
  RecipientFormRow,
} from '../_types/company.offer.create.types';

const TEMPLATE_FIELD_PREFIX = 'templateField:';

export function getTemplateFieldName(templateId: string, fieldKey: string) {
  return `${TEMPLATE_FIELD_PREFIX}${templateId}:${fieldKey}`;
}

export function readCreateOfferValues(formData: FormData): CreateOfferValues {
  const templateValues: Record<string, TemplateFieldValue> = {};

  for (const key of formData.keys()) {
    if (!key.startsWith(TEMPLATE_FIELD_PREFIX)) continue;
    const values = formData
      .getAll(key)
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
    templateValues[key] = values.length > 1 ? values : (values[0] ?? '');
  }

  return {
    orgNumber: String(formData.get('orgNumber') ?? '').trim(),
    templateId: String(formData.get('templateId') ?? '').trim(),
    validUntil: String(formData.get('validUntil') ?? '').trim(),
    templateValues,
    lineDescriptions: formData.getAll('lineDescription').map((value) => String(value ?? '').trim()),
    lineQuantities: formData.getAll('lineQuantity').map((value) => String(value ?? '').trim()),
    lineUnitPrices: formData.getAll('lineUnitPrice').map((value) => String(value ?? '').trim()),
    lineVatRates: formData.getAll('lineVatRate').map((value) => String(value ?? '').trim()),
    recipientNames: formData.getAll('recipientName').map((value) => String(value ?? '').trim()),
    recipientEmails: formData.getAll('recipientEmail').map((value) => String(value ?? '').trim()),
    recipientMobiles: formData.getAll('recipientMobile').map((value) => String(value ?? '').trim()),
  };
}

export function createDefaultValues(templateId: string): CreateOfferValues {
  return {
    orgNumber: '',
    templateId,
    validUntil: '',
    templateValues: {},
    lineDescriptions: [''],
    lineQuantities: ['1'],
    lineUnitPrices: ['0'],
    lineVatRates: ['25'],
    recipientNames: [''],
    recipientEmails: [''],
    recipientMobiles: [''],
  };
}

export function createLineRows(values: CreateOfferValues): LineFormRow[] {
  const count = Math.max(
    1,
    values.lineDescriptions.length,
    values.lineQuantities.length,
    values.lineUnitPrices.length,
    values.lineVatRates.length,
  );
  return Array.from({ length: count }, (_, index) => ({
    key: `line-${index}`,
    description: values.lineDescriptions[index] ?? '',
    quantity: values.lineQuantities[index] ?? '1',
    unitPrice: values.lineUnitPrices[index] ?? '0',
    vatRate: values.lineVatRates[index] ?? '25',
  }));
}

export function createBlankLineRow(index: number): LineFormRow {
  return {
    key: `line-${Date.now()}-${index}`,
    description: '',
    quantity: '1',
    unitPrice: '0',
    vatRate: '25',
  };
}

export function createRecipientRows(values: CreateOfferValues): RecipientFormRow[] {
  const count = Math.max(
    1,
    values.recipientNames.length,
    values.recipientEmails.length,
    values.recipientMobiles.length,
  );
  return Array.from({ length: count }, (_, index) => ({
    key: `recipient-${index}`,
    name: values.recipientNames[index] ?? '',
    email: values.recipientEmails[index] ?? '',
    mobileNumber: values.recipientMobiles[index] ?? '',
  }));
}

export function createBlankRecipientRow(index: number): RecipientFormRow {
  return {
    key: `recipient-${Date.now()}-${index}`,
    name: '',
    email: '',
    mobileNumber: '',
  };
}

export function isSupportedTemplateField(field: OfferTemplateFieldDto) {
  return field.type === 'text' || field.type === 'textarea' || field.type === 'date' || field.type === 'panel_selector';
}

export function parseTemplateData(formData: FormData, template: OfferTemplateDto): Record<string, unknown> | Error {
  const result: Record<string, unknown> = {};

  for (const field of template.fields) {
    if (!isSupportedTemplateField(field)) {
      if (field.required) {
        return new Error(`Feltet "${field.label}" har typen "${field.type}" og kan ikke fylles ut ennå.`);
      }
      continue;
    }

    const formName = getTemplateFieldName(template.id, field.key);
    const rawValues = formData
      .getAll(formName)
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);
    const value = field.type === 'panel_selector' ? rawValues : (rawValues[0] ?? '');

    if (field.required && (Array.isArray(value) ? value.length === 0 : !value)) {
      return new Error(`Feltet "${field.label}" er påkrevd.`);
    }

    if (!Array.isArray(value) && value && field.validation?.pattern) {
      const pattern = new RegExp(field.validation.pattern);
      if (!pattern.test(value)) {
        return new Error(`Feltet "${field.label}" har ugyldig format.`);
      }
    }

    if (Array.isArray(value) ? value.length > 0 : Boolean(value)) {
      result[field.key] = value;
    }
  }

  return result;
}

export function parseDateValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseInitialLines(values: CreateOfferValues): ReplaceOfferLineRequest[] | Error {
  const lines: ReplaceOfferLineRequest[] = [];

  for (let index = 0; index < values.lineDescriptions.length; index += 1) {
    const description = values.lineDescriptions[index];
    if (!description) continue;

    const quantity = Number(values.lineQuantities[index] || 1);
    const unitPrice = Number(values.lineUnitPrices[index] || 0);
    const vatRate = Number(values.lineVatRates[index] || 25);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return new Error(`Antall på linje ${index + 1} må være høyere enn 0.`);
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return new Error(`Enhetspris på linje ${index + 1} må være 0 eller høyere.`);
    }

    if (!Number.isFinite(vatRate) || vatRate < 0) {
      return new Error(`MVA på linje ${index + 1} må være 0 eller høyere.`);
    }

    lines.push({
      description,
      quantity,
      unitPrice,
      vatRate,
      position: lines.length,
    });
  }

  return lines;
}

export function parseRecipientRows(values: CreateOfferValues) {
  return values.recipientEmails
    .map((email, index) => ({
      name: values.recipientNames[index] ?? '',
      email,
      mobileNumber: values.recipientMobiles[index] ?? '',
    }))
    .filter((recipient) => recipient.email);
}

export function calculatePreviewTotal(values: CreateOfferValues): number {
  return values.lineDescriptions.reduce((sum, description, index) => {
    if (!description) return sum;

    const quantity = Number(values.lineQuantities[index] || 0);
    const unitPrice = Number(values.lineUnitPrices[index] || 0);
    const vatRate = Number(values.lineVatRates[index] || 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !Number.isFinite(vatRate)) {
      return sum;
    }

    const subtotal = quantity * unitPrice;
    return sum + subtotal + subtotal * (vatRate / 100);
  }, 0);
}

export function countFilled(values: string[]) {
  return values.filter(Boolean).length;
}
