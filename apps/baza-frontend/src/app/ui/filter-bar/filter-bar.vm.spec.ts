import { describe, expect, it } from 'vitest';
import {
  cadenceChipLabel,
  countriesChipLabel,
  hasOfferFilters,
  licenceChipLabel,
  offerCountLabel,
  transportChipLabel,
} from './filter-bar.vm';

describe('filter-bar labels', () => {
  it('pluralizes offer counts in Polish', () => {
    expect(offerCountLabel(0)).toBe('0 ofert');
    expect(offerCountLabel(1)).toBe('1 oferta');
    expect(offerCountLabel(2)).toBe('2 oferty');
    expect(offerCountLabel(4)).toBe('4 oferty');
    expect(offerCountLabel(5)).toBe('5 ofert');
    expect(offerCountLabel(12)).toBe('12 ofert');
    expect(offerCountLabel(22)).toBe('22 oferty');
  });

  it('labels country chips with Polish names for a single country', () => {
    expect(countriesChipLabel([])).toBe('Kraje trasy');
    expect(countriesChipLabel(['IT'])).toBe('Kraje trasy: Włochy');
    expect(countriesChipLabel(['IT', 'DE'])).toBe('Kraje trasy: IT, DE');
  });

  it('labels the other chips from selected values', () => {
    expect(cadenceChipLabel(null, { weekly: 'Co tydzień' })).toBe(
      'Powrót do domu'
    );
    expect(cadenceChipLabel('weekly', { weekly: 'Co tydzień' })).toBe(
      'Powrót do domu: Co tydzień'
    );
    expect(licenceChipLabel(null)).toBe('Prawo jazdy');
    expect(licenceChipLabel('C_E')).toBe('Prawo jazdy: C+E');
    expect(transportChipLabel(null)).toBe('Typ transportu');
    expect(transportChipLabel('curtain')).toBe(
      'Typ transportu: Plandeka / firanka'
    );
  });

  it('detects active filters', () => {
    expect(
      hasOfferFilters({
        routeCountries: [],
        cadence: null,
        licence: null,
        transport: null,
      })
    ).toBe(false);
    expect(
      hasOfferFilters({
        routeCountries: ['DE'],
        cadence: null,
        licence: null,
        transport: null,
      })
    ).toBe(true);
  });
});
