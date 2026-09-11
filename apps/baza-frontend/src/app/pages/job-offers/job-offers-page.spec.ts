import { HttpParams } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import {
  hasActiveJobOfferFilters,
  jobOffersQueryToHttpParams,
  jobOffersQueryToRouterParams,
  parseJobOffersQueryParams,
  type JobOffersQueryModel,
} from './job-offers-page';

describe('job-offers query helpers', () => {
  it('parses countries, cadence, license and near from query params', () => {
    const map: Record<string, string> = {
      countries: 'pl,de',
      cadence: 'weekly',
      license: 'C_E',
      nearLat: '52.1',
      nearLng: '21.0',
    };
    const model = parseJobOffersQueryParams((k) => map[k] ?? null);
    expect(model).toEqual({
      countries: ['PL', 'DE'],
      cadence: 'weekly',
      license: 'C_E',
      nearLat: 52.1,
      nearLng: 21.0,
    });
  });

  it('builds HttpParams with C_E never as C+E', () => {
    const model: JobOffersQueryModel = {
      countries: ['IT'],
      cadence: 'flexible',
      license: 'C_E',
      nearLat: null,
      nearLng: null,
    };
    const params = jobOffersQueryToHttpParams(model);
    expect(params.get('countries')).toBe('IT');
    expect(params.get('cadence')).toBe('flexible');
    expect(params.get('license')).toBe('C_E');
    expect(params.get('nearLat')).toBeNull();
  });

  it('maps empty filters to null router params for clear', () => {
    const params = jobOffersQueryToRouterParams({
      countries: [],
      cadence: '',
      license: '',
      nearLat: null,
      nearLng: null,
    });
    expect(params).toEqual({
      countries: null,
      cadence: null,
      license: null,
      nearLat: null,
      nearLng: null,
    });
  });

  it('detects active filters for empty-state CTA', () => {
    expect(
      hasActiveJobOfferFilters({
        countries: [],
        cadence: '',
        license: '',
        nearLat: null,
        nearLng: null,
      })
    ).toBe(false);
    expect(
      hasActiveJobOfferFilters({
        countries: ['DE'],
        cadence: '',
        license: '',
        nearLat: null,
        nearLng: null,
      })
    ).toBe(true);
  });

  it('HttpParams instance is usable', () => {
    const params = jobOffersQueryToHttpParams({
      countries: ['PL'],
      cadence: '',
      license: '',
      nearLat: 1,
      nearLng: 2,
    });
    expect(params).toBeInstanceOf(HttpParams);
    expect(params.toString()).toContain('nearLat=1');
  });
});
