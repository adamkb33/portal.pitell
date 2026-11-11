import type { OfferLineDto, ReplaceOfferLineRequest } from '~/api/generated';

export type OfferLineFormRow = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  catalogItemId: string;
};

export function parseOfferLineFormData(formData: FormData): ReplaceOfferLineRequest[] {
  const descriptions = formData.getAll('lineDescription');
  const quantities = formData.getAll('lineQuantity');
  const unitPrices = formData.getAll('lineUnitPrice');
  const vatRates = formData.getAll('lineVatRate');
  const catalogItemIds = formData.getAll('lineCatalogItemId');
  const positions = formData.getAll('linePosition');

  return descriptions
    .map((descriptionValue, index): ReplaceOfferLineRequest | null => {
      const description = String(descriptionValue ?? '').trim();
      if (!description) return null;

      const quantity = Number(quantities[index] ?? 1);
      const unitPrice = Number(unitPrices[index] ?? 0);
      const vatRate = Number(vatRates[index] ?? 25);
      const catalogItemId = Number(catalogItemIds[index]);
      const position = Number(positions[index]);

      const line: ReplaceOfferLineRequest = {
        description,
        quantity: Number.isFinite(quantity) ? quantity : 1,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        vatRate: Number.isFinite(vatRate) ? vatRate : 25,
        position: Number.isFinite(position) ? position : index,
      };

      if (Number.isFinite(catalogItemId) && catalogItemId > 0) {
        line.catalogItemId = catalogItemId;
      }

      return line;
    })
    .filter((line): line is ReplaceOfferLineRequest => line !== null);
}

export function toOfferLineFormRow(line: OfferLineDto): OfferLineFormRow {
  return {
    key: `line-${line.id}`,
    description: line.description,
    quantity: String(line.quantity),
    unitPrice: String(line.unitPrice),
    vatRate: String(line.vatRate),
    catalogItemId: line.catalogItemId?.toString() ?? '',
  };
}

export function createBlankOfferLineRows(count: number): OfferLineFormRow[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `blank-${index}`,
    description: '',
    quantity: '1',
    unitPrice: '0',
    vatRate: '25',
    catalogItemId: '',
  }));
}
