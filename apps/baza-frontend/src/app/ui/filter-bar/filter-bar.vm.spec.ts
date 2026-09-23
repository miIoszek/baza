import { describe, expect, it } from 'vitest';
import {
  cadenceChipLabel,
  countriesChipLabel,
  hasOfferFilters,
  licenceChipLabel,
  offerCountLabel,
  transportChipLabel,
  employmentChipLabel,
  visibleCountryChips,
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
    expect(cadenceChipLabel([], { weekly: 'Co tydzień' })).toBe(
      'Powrót do domu'
    );
    expect(cadenceChipLabel(['weekly'], { weekly: 'Co tydzień' })).toBe(
      'Powrót do domu: Co tydzień'
    );
    expect(cadenceChipLabel(['weekly', 'daily'], { weekly: 'Co tydzień' })).toBe(
      'Powrót do domu: 2 wybrane'
    );
    expect(licenceChipLabel([])).toBe('Prawo jazdy');
    expect(licenceChipLabel(['C_E'])).toBe('Prawo jazdy: C+E');
    expect(transportChipLabel([])).toBe('Typ transportu');
    expect(transportChipLabel(['curtain'])).toBe(
      'Typ transportu: Plandeka / firanka'
    );
    expect(employmentChipLabel([])).toBe('Forma zatrudnienia');
    expect(employmentChipLabel(['uop'])).toBe(
      'Forma zatrudnienia: Umowa o pracę'
    );
  });

  it('detects active filters', () => {
    expect(
      hasOfferFilters({
        routeCountries: [],
        cadences: [],
        licences: [],
        transports: [],
        employmentForms: [],
      })
    ).toBe(false);
    expect(
      hasOfferFilters({
        routeCountries: ['DE'],
        cadences: [],
        licences: [],
        transports: [],
        employmentForms: [],
      })
    ).toBe(true);
    expect(
      hasOfferFilters({
        routeCountries: [],
        cadences: [],
        licences: [],
        transports: [],
        employmentForms: ['uop'],
      })
    ).toBe(true);
  });
});

describe('visibleCountryChips', () => {
  const countries = [
    { code: 'PL' },
    { code: 'DE' },
    { code: 'CZ' },
    { code: 'SK' },
    { code: 'AT' },
    { code: 'HU' },
    { code: 'LT' },
  ];

  it('shows every country when there are five or fewer', () => {
    expect(visibleCountryChips(countries.slice(0, 5), [], false)).toEqual({
      visible: countries.slice(0, 5),
      hiddenCount: 0,
    });
  });

  it('keeps the first five and reports the rest when collapsed', () => {
    expect(visibleCountryChips(countries, [], false)).toEqual({
      visible: countries.slice(0, 5),
      hiddenCount: 2,
    });
  });

  it('keeps a selected country visible even if it is past the first five', () => {
    const result = visibleCountryChips(countries, ['LT'], false);
    expect(result.visible.map((c) => c.code)).toEqual([
      'PL',
      'DE',
      'CZ',
      'SK',
      'LT',
    ]);
    expect(result.hiddenCount).toBe(2);
  });

  it('shows all countries when expanded', () => {
    expect(visibleCountryChips(countries, [], true).hiddenCount).toBe(0);
    expect(visibleCountryChips(countries, [], true).visible).toEqual(countries);
  });
});
