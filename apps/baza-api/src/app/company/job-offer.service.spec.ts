import type { JobOffer, JobOfferFilters } from '@baza/shared-types';
import { JobOfferService } from './job-offer.service';

describe('JobOfferService.matchesFilters', () => {
  const service = new JobOfferService({} as never, {} as never);

  const baseOffer: JobOffer = {
    id: '1',
    companyId: 'c1',
    title: 'Test',
    routes: [{ from: { code: 'PL', name: 'Polska' }, to: { code: 'DE', name: 'Niemcy' } }],
    homeReturnCadence: 'weekly',
    requiredYearsExperience: 1,
    requiredTransportType: 'curtain',
    licenseCategory: 'C_E',
    employmentForms: ['uop', 'b2b'],
    description: 'd',
    baseLocation: null,
    companyBaseLocationText: 'Warszawa',
    companyName: 'Co',
    companyPhotoUrls: null,
    published: true,
    publishedAt: '2026-01-01T00:00:00.000Z',
  };

  it('matches when any selected cadence fits (OR within dimension)', () => {
    const filters: JobOfferFilters = {
      homeReturnCadences: ['daily', 'weekly'],
    };
    expect(service.matchesFilters(baseOffer, filters)).toBe(true);
    expect(
      service.matchesFilters(
        { ...baseOffer, homeReturnCadence: 'monthly' },
        filters
      )
    ).toBe(false);
  });

  it('matches when offer cadence is flexible and filter includes a cadence', () => {
    expect(
      service.matchesFilters(
        { ...baseOffer, homeReturnCadence: 'flexible' },
        { homeReturnCadences: ['monthly'] }
      )
    ).toBe(true);
  });

  it('matches when license or transport is in selected sets', () => {
    expect(
      service.matchesFilters(baseOffer, {
        licenseCategories: ['C', 'C_E'],
      })
    ).toBe(true);
    expect(
      service.matchesFilters(baseOffer, {
        requiredTransportTypes: ['curtain', 'silo'],
      })
    ).toBe(true);
    expect(
      service.matchesFilters(baseOffer, {
        licenseCategories: ['B'],
      })
    ).toBe(false);
  });

  it('matches employment when offer and filter sets overlap', () => {
    expect(
      service.matchesFilters(baseOffer, { employmentForms: ['b2b'] })
    ).toBe(true);
    expect(
      service.matchesFilters(baseOffer, { employmentForms: ['zlecenie'] })
    ).toBe(false);
    expect(
      service.matchesFilters(
        { ...baseOffer, employmentForms: ['zlecenie'] },
        { employmentForms: ['uop', 'zlecenie'] }
      )
    ).toBe(true);
    expect(service.matchesFilters(baseOffer, { employmentForms: [] })).toBe(
      true
    );
  });
});

describe('JobOfferService.parseListQuery', () => {
  const service = new JobOfferService({} as never, {} as never);

  it('maps employment CSV onto employmentForms in allowlist order', () => {
    expect(service.parseListQuery({ employment: 'b2b,uop' })).toEqual({
      employmentForms: ['uop', 'b2b'],
    });
  });

  it('omits employmentForms when the query is empty', () => {
    expect(service.parseListQuery({})).toEqual({});
  });

  it('rejects unknown employment codes', () => {
    expect(() => service.parseListQuery({ employment: 'cash' })).toThrow(
      'Nieprawidłowa forma zatrudnienia'
    );
  });
});
