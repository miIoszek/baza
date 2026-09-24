import { describe, expect, it } from 'vitest';
import { pickCompanyLogoUrl } from './company-logo-url';
import {
  buildActiveFilterTags,
  hasActiveJobOfferFilters,
  jobOffersQueryToHttpParams,
  jobOffersQueryToRouterParams,
  parseJobOffersQueryParams,
  removeFilterTagFromQuery,
  type JobOffersQueryModel,
} from './job-offers-page';

describe('pickCompanyLogoUrl', () => {
  it('prefers s48 then s96 then original', () => {
    expect(
      pickCompanyLogoUrl({
        original: 'o',
        s96: 'm',
        s48: 's',
      })
    ).toBe('s');
    expect(pickCompanyLogoUrl({ original: 'o', s96: 'm' })).toBe('m');
    expect(pickCompanyLogoUrl({ original: 'o' })).toBe('o');
  });

  it('returns null for missing urls', () => {
    expect(pickCompanyLogoUrl(null)).toBeNull();
    expect(pickCompanyLogoUrl(undefined)).toBeNull();
    expect(pickCompanyLogoUrl({})).toBeNull();
  });
});

describe('job-offers query helpers', () => {
  it('parses multiselect filter query params', () => {
    const map: Record<string, string> = {
      countries: 'pl,de',
      cadence: 'weekly,daily',
      license: 'C,C_E',
      transport: 'silo,curtain',
      employment: 'uop,b2b',
      nearLat: '52.1',
      nearLng: '21.0',
    };
    const model = parseJobOffersQueryParams((k) => map[k] ?? null);
    expect(model).toEqual({
      countries: ['PL', 'DE'],
      cadences: ['weekly', 'daily'],
      licenses: ['C', 'C_E'],
      transports: ['silo', 'curtain'],
      employmentForms: ['uop', 'b2b'],
      nearLat: 52.1,
      nearLng: 21.0,
    });
  });

  it('builds HttpParams with comma-separated multiselect values', () => {
    const model: JobOffersQueryModel = {
      countries: ['IT'],
      cadences: ['flexible', 'weekly'],
      licenses: ['C_E'],
      transports: ['curtain', 'silo'],
      employmentForms: ['uop'],
      nearLat: null,
      nearLng: null,
    };
    const params = jobOffersQueryToHttpParams(model);
    expect(params.get('countries')).toBe('IT');
    expect(params.get('cadence')).toBe('flexible,weekly');
    expect(params.get('license')).toBe('C_E');
    expect(params.get('transport')).toBe('curtain,silo');
    expect(params.get('employment')).toBe('uop');
    expect(params.get('nearLat')).toBeNull();
  });

  it('maps empty filters to null router params for clear', () => {
    const params = jobOffersQueryToRouterParams({
      countries: [],
      cadences: [],
      licenses: [],
      transports: [],
      employmentForms: [],
      nearLat: null,
      nearLng: null,
    });
    expect(params).toEqual({
      countries: null,
      cadence: null,
      license: null,
      transport: null,
      employment: null,
      nearLat: null,
      nearLng: null,
    });
  });

  it('detects active filters for empty-state CTA', () => {
    expect(
      hasActiveJobOfferFilters({
        countries: [],
        cadences: [],
        licenses: [],
        transports: [],
        employmentForms: [],
        nearLat: null,
        nearLng: null,
      })
    ).toBe(false);
    expect(
      hasActiveJobOfferFilters({
        countries: ['DE'],
        cadences: [],
        licenses: [],
        transports: [],
        employmentForms: [],
        nearLat: null,
        nearLng: null,
      })
    ).toBe(true);
    expect(
      hasActiveJobOfferFilters({
        countries: [],
        cadences: [],
        licenses: [],
        transports: ['silo'],
        employmentForms: [],
        nearLat: null,
        nearLng: null,
      })
    ).toBe(true);
    expect(
      hasActiveJobOfferFilters({
        countries: [],
        cadences: [],
        licenses: [],
        transports: [],
        employmentForms: ['uop'],
        nearLat: null,
        nearLng: null,
      })
    ).toBe(true);
  });

  it('treats near-only query as active filters for empty-state CTA', () => {
    expect(
      hasActiveJobOfferFilters({
        countries: [],
        cadences: [],
        licenses: [],
        transports: [],
        employmentForms: [],
        nearLat: 52,
        nearLng: 21,
      })
    ).toBe(true);
  });

  it('HttpParams keys match Nest ListOffersQueryDto wire names (Risk #4)', () => {
    const params = jobOffersQueryToHttpParams({
      countries: ['PL', 'DE'],
      cadences: ['weekly'],
      licenses: ['C_E'],
      transports: ['silo'],
      employmentForms: ['uop'],
      nearLat: 52.2,
      nearLng: 21.0,
    });
    const keys = params.keys().sort();
    expect(keys).toEqual(
      [
        'cadence',
        'countries',
        'employment',
        'license',
        'nearLat',
        'nearLng',
        'transport',
      ].sort()
    );
    expect(params.get('countries')).toBe('PL,DE');
    expect(params.get('cadence')).toBe('weekly');
    expect(params.get('license')).toBe('C_E');
    expect(params.get('transport')).toBe('silo');
    expect(params.get('employment')).toBe('uop');
    expect(params.get('homeReturnCadence')).toBeNull();
    expect(params.get('licenseCategory')).toBeNull();
    expect(params.get('requiredTransportType')).toBeNull();
    expect(params.get('employmentForms')).toBeNull();
  });

  it('builds removable active filter tags from query', () => {
    const query: JobOffersQueryModel = {
      countries: ['PL', 'DE'],
      cadences: ['weekly'],
      licenses: ['C_E'],
      transports: ['curtain'],
      employmentForms: ['uop'],
      nearLat: 52,
      nearLng: 21,
    };
    const tags = buildActiveFilterTags(query, { weekly: 'Co tydzień' }, [
      { code: 'PL', namePl: 'Polska' },
      { code: 'DE', namePl: 'Niemcy' },
    ]);
    expect(tags.map((t) => t.id)).toEqual([
      'country:PL',
      'country:DE',
      'cadence:weekly',
      'license:C_E',
      'transport:curtain',
      'employment:uop',
      'near',
    ]);
    expect(removeFilterTagFromQuery(query, 'country:PL').countries).toEqual([
      'DE',
    ]);
    expect(removeFilterTagFromQuery(query, 'cadence:weekly').cadences).toEqual(
      []
    );
    expect(
      removeFilterTagFromQuery(query, 'employment:uop').employmentForms
    ).toEqual([]);
    expect(removeFilterTagFromQuery(query, 'near').nearLat).toBeNull();
  });
});
