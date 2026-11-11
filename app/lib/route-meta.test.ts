import { describe, expect, it } from 'vitest';
import { getRouteMetadata } from './route-meta';

describe('getRouteMetadata', () => {
  it('prefers an exact path over a sibling pattern', () => {
    expect(getRouteMetadata('/company/marketing/create').title).toBe('Ny kampanje | Pitell');
    expect(getRouteMetadata('/company/offers/create').title).toBe('Opprett tilbud | Pitell');
  });

  it('still matches patterns for ids', () => {
    expect(getRouteMetadata('/company/marketing/13').title).toBe('Kampanjedetaljer | Pitell');
    expect(getRouteMetadata('/company/offers/7').title).toBe('Tilbudsdetaljer | Pitell');
  });
});
