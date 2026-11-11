import { describe, expect, it } from 'vitest';
import type { CompanySummaryDto } from '~/api/generated';
import { formatCompanyName } from '~/routes/booking/public/_utils/booking-company-name';
import { buildShortAddress } from './booking.public.appointment.route';

describe('public booking place list', () => {
  it('shows registry names in normal case but keeps company suffixes', () => {
    expect(formatCompanyName('FREDRIKSTAD BARBERSHOP BAHAR')).toBe('Fredrikstad Barbershop Bahar');
    expect(formatCompanyName('OSLO KLIPP AS')).toBe('Oslo Klipp AS');
    expect(formatCompanyName('Klipp & Stell')).toBe('Klipp & Stell');
  });

  it('shortens the address to street and city', () => {
    const company = {
      businessAddress: {
        addressLines: ['Brogata 12'],
        postalCode: '1608',
        city: 'FREDRIKSTAD',
        country: 'Norge',
      },
    } as unknown as CompanySummaryDto;

    expect(buildShortAddress(company)).toBe('Brogata 12, Fredrikstad');
    expect(buildShortAddress({} as CompanySummaryDto)).toBeNull();
  });
});
