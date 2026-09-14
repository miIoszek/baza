import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { JobOffer } from '@baza/shared-types';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { CreateJobOfferDto } from './dto/job-offer.dto';
import { JobOfferService } from './job-offer.service';

describe('JobOfferService', () => {
  let service: JobOfferService;
  const from = jest.fn();
  const getClient = jest.fn(() => ({ from }));
  const isPrivateConfigured = jest.fn(() => true);
  const deletePrivatePrefixOrThrow = jest.fn(async () => undefined);

  const baseDto: CreateJobOfferDto = {
    title: 'Kierowca PL-DE',
    description: 'Trasa międzynarodowa',
    homeReturnCadence: 'weekly',
    requiredYearsExperience: 2,
    requiredTransportType: 'curtain',
    licenseCategory: 'C',
    routes: [
      {
        from: { code: 'PL', name: 'Polska' },
        to: { code: 'DE', name: 'Niemcy' },
      },
    ],
    published: true,
  };

  const baseOffer = (overrides: Partial<JobOffer> = {}): JobOffer => ({
    id: 'offer-1',
    companyId: 'company-1',
    title: 'A',
    description: 'd',
    homeReturnCadence: 'weekly',
    requiredYearsExperience: 1,
    requiredTransportType: 'van',
    licenseCategory: 'C',
    routes: baseDto.routes,
    baseLocation: { lat: 52.2, lng: 21.0 },
    companyBaseLocationText: 'Warsaw',
    companyName: 'Acme Transport',
    companyPhotoUrls: null,
    published: true,
    publishedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    from.mockReset();
    getClient.mockClear();
    isPrivateConfigured.mockReset();
    isPrivateConfigured.mockReturnValue(true);
    deletePrivatePrefixOrThrow.mockReset();
    deletePrivatePrefixOrThrow.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferService,
        {
          provide: SupabaseAuthService,
          useValue: { getClient },
        },
        {
          provide: R2StorageService,
          useValue: {
            isPrivateConfigured,
            deletePrivatePrefixOrThrow,
          },
        },
      ],
    }).compile();

    service = module.get(JobOfferService);
  });

  function mockCompanyLookup(lat: number | null, lng: number | null) {
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'company-1', base_lat: lat, base_lng: lng },
            error: null,
          }),
        }),
      }),
    }));
  }

  it('rejects publish when company has no coords', async () => {
    mockCompanyLookup(null, null);

    await expect(service.createForUser('user-1', baseDto)).rejects.toThrow(
      /współrzędne/i
    );
  });

  it('allows unpublished create without coords', async () => {
    mockCompanyLookup(null, null);
    from.mockImplementationOnce(() => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 'offer-1',
              company_id: 'company-1',
              title: baseDto.title,
              description: baseDto.description,
              home_return_cadence: baseDto.homeReturnCadence,
              required_years_experience: baseDto.requiredYearsExperience,
              required_transport_type: baseDto.requiredTransportType,
              license_category: 'C',
              routes: baseDto.routes,
              salary_min: null,
              salary_max: null,
              salary_currency: null,
              published: false,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              companies: {
                base_lat: null,
                base_lng: null,
                base_location: 'Warsaw',
              },
            },
            error: null,
          }),
        }),
      }),
    }));

    const result = await service.createForUser('user-1', {
      ...baseDto,
      published: false,
    });

    expect(result.published).toBe(false);
    expect(result.baseLocation).toBeNull();
    expect(result.licenseCategory).toBe('C');
  });

  it('rejects salary min greater than max', async () => {
    await expect(
      service.createForUser('user-1', {
        ...baseDto,
        salaryMin: 5000,
        salaryMax: 4000,
        salaryCurrency: 'PLN',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('listPublished maps only published rows from query', async () => {
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                id: 'offer-1',
                company_id: 'company-1',
                title: 'A',
                description: 'd',
                home_return_cadence: 'weekly',
                required_years_experience: 1,
                required_transport_type: 'van',
                license_category: 'CE',
                routes: baseDto.routes,
                salary_min: null,
                salary_max: null,
                salary_currency: null,
                published: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
                companies: {
                  base_lat: 52.2,
                  base_lng: 21.0,
                  base_location: 'Warsaw',
                  name: 'Acme Transport',
                  photo_urls: {
                    s48: 'https://cdn.example/n48.webp',
                    s96: 'https://cdn.example/n96.webp',
                  },
                },
              },
            ],
            error: null,
          }),
        }),
      }),
    }));

    const list = await service.listPublished();
    expect(list).toHaveLength(1);
    expect(list[0].baseLocation).toEqual({ lat: 52.2, lng: 21.0 });
    expect(list[0].licenseCategory).toBe('CE');
    expect(list[0].companyName).toBe('Acme Transport');
    expect(list[0].companyPhotoUrls).toEqual({
      s48: 'https://cdn.example/n48.webp',
      s96: 'https://cdn.example/n96.webp',
    });
  });

  it('listPublished defaults missing license_category to C for legacy rows', async () => {
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                id: 'offer-legacy',
                company_id: 'company-1',
                title: 'Legacy',
                description: 'd',
                home_return_cadence: 'weekly',
                required_years_experience: 1,
                required_transport_type: 'van',
                license_category: null,
                routes: baseDto.routes,
                salary_min: null,
                salary_max: null,
                salary_currency: null,
                published: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
                companies: null,
              },
            ],
            error: null,
          }),
        }),
      }),
    }));

    const list = await service.listPublished();
    expect(list[0].licenseCategory).toBe('C');
    expect(list[0].companyName).toBe('');
    expect(list[0].companyPhotoUrls).toBeNull();
  });

  it('listPublished fails loud on unexpected license_category', async () => {
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: [
              {
                id: 'offer-bad',
                company_id: 'company-1',
                title: 'Bad',
                description: 'd',
                home_return_cadence: 'weekly',
                required_years_experience: 1,
                required_transport_type: 'van',
                license_category: 'ZZ',
                routes: baseDto.routes,
                salary_min: null,
                salary_max: null,
                salary_currency: null,
                published: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
                companies: null,
              },
            ],
            error: null,
          }),
        }),
      }),
    }));

    await expect(service.listPublished()).rejects.toBeInstanceOf(
      InternalServerErrorException
    );
  });

  it('matches country on from OR to', () => {
    const offer = baseOffer();
    expect(service.matchesFilters(offer, { countries: ['DE'] })).toBe(true);
    expect(service.matchesFilters(offer, { countries: ['PL'] })).toBe(true);
    expect(service.matchesFilters(offer, { countries: ['IT'] })).toBe(false);
  });

  it('matches cadence with flexible wildcard', () => {
    const weekly = baseOffer({ homeReturnCadence: 'weekly' });
    const flexible = baseOffer({ homeReturnCadence: 'flexible' });
    expect(
      service.matchesFilters(weekly, { homeReturnCadence: 'weekly' })
    ).toBe(true);
    expect(
      service.matchesFilters(weekly, { homeReturnCadence: 'daily' })
    ).toBe(false);
    expect(
      service.matchesFilters(weekly, { homeReturnCadence: 'flexible' })
    ).toBe(true);
    expect(
      service.matchesFilters(flexible, { homeReturnCadence: 'daily' })
    ).toBe(true);
  });

  it('matches license exactly', () => {
    const offer = baseOffer({ licenseCategory: 'C_E' });
    expect(service.matchesFilters(offer, { licenseCategory: 'C_E' })).toBe(
      true
    );
    expect(service.matchesFilters(offer, { licenseCategory: 'C' })).toBe(false);
  });

  it('matches transport type exactly', () => {
    const offer = baseOffer({ requiredTransportType: 'silo' });
    expect(
      service.matchesFilters(offer, { requiredTransportType: 'silo' })
    ).toBe(true);
    expect(
      service.matchesFilters(offer, { requiredTransportType: 'curtain' })
    ).toBe(false);
  });

  it('sortByNear puts null baseLocation last', () => {
    const near = { lat: 52.0, lng: 21.0 };
    const nearOffer = baseOffer({
      id: 'near',
      baseLocation: { lat: 52.1, lng: 21.0 },
    });
    const farOffer = baseOffer({
      id: 'far',
      baseLocation: { lat: 50.0, lng: 19.0 },
    });
    const noPin = baseOffer({ id: 'nopin', baseLocation: null });

    const sorted = service.sortByNear([farOffer, noPin, nearOffer], near);
    expect(sorted.map((o) => o.id)).toEqual(['near', 'far', 'nopin']);
  });

  it('parseListQuery rejects incomplete near pair', () => {
    expect(() =>
      service.parseListQuery({ nearLat: 52 } as never)
    ).toThrow(BadRequestException);
  });

  describe('Risk #3 fixture membership oracle', () => {
    const fixtures: JobOffer[] = [
      baseOffer({
        id: 'o-pl-de-weekly',
        homeReturnCadence: 'weekly',
        routes: [
          {
            from: { code: 'PL', name: 'Polska' },
            to: { code: 'DE', name: 'Niemcy' },
          },
        ],
      }),
      baseOffer({
        id: 'o-it-fr-daily',
        homeReturnCadence: 'daily',
        routes: [
          {
            from: { code: 'IT', name: 'Włochy' },
            to: { code: 'FR', name: 'Francja' },
          },
        ],
      }),
      baseOffer({
        id: 'o-de-nl-flexible',
        homeReturnCadence: 'flexible',
        routes: [
          {
            from: { code: 'DE', name: 'Niemcy' },
            to: { code: 'NL', name: 'Holandia' },
          },
        ],
      }),
      baseOffer({
        id: 'o-pl-cz-monthly',
        homeReturnCadence: 'monthly',
        routes: [
          {
            from: { code: 'PL', name: 'Polska' },
            to: { code: 'CZ', name: 'Czechy' },
          },
        ],
      }),
    ];

    function matchingIds(filters: Parameters<JobOfferService['matchesFilters']>[1]) {
      return new Set(
        fixtures.filter((o) => service.matchesFilters(o, filters)).map((o) => o.id)
      );
    }

    it('returns exact ID sets for country and cadence filters (not merely non-empty)', () => {
      expect(matchingIds({ countries: ['DE'] })).toEqual(
        new Set(['o-pl-de-weekly', 'o-de-nl-flexible'])
      );
      expect(matchingIds({ countries: ['PL'] })).toEqual(
        new Set(['o-pl-de-weekly', 'o-pl-cz-monthly'])
      );
      expect(matchingIds({ countries: ['IT'] })).toEqual(
        new Set(['o-it-fr-daily'])
      );
      expect(matchingIds({ homeReturnCadence: 'weekly' })).toEqual(
        new Set(['o-pl-de-weekly', 'o-de-nl-flexible'])
      );
      expect(matchingIds({ homeReturnCadence: 'daily' })).toEqual(
        new Set(['o-it-fr-daily', 'o-de-nl-flexible'])
      );
      expect(
        matchingIds({ countries: ['PL'], homeReturnCadence: 'daily' })
      ).toEqual(new Set());
      expect(
        matchingIds({ countries: ['DE'], homeReturnCadence: 'monthly' })
      ).toEqual(new Set(['o-de-nl-flexible']));
      expect(matchingIds({ countries: ['XX'] })).toEqual(new Set());
    });
  });

  describe('Risk #4 wire→product contract (parseListQuery)', () => {
    it('maps cadence/license/transport/near wire names to JobOfferFilters fields', () => {
      expect(
        service.parseListQuery({
          countries: 'pl, de',
          cadence: 'weekly',
          license: 'C_E',
          transport: 'silo',
          nearLat: 52.2,
          nearLng: 21.0,
        } as never)
      ).toEqual({
        countries: ['PL', 'DE'],
        homeReturnCadence: 'weekly',
        licenseCategory: 'C_E',
        requiredTransportType: 'silo',
        near: { lat: 52.2, lng: 21.0 },
      });
    });

    it('omits unset wire fields from product filters', () => {
      expect(service.parseListQuery({} as never)).toEqual({});
      expect(
        service.parseListQuery({ cadence: 'flexible' } as never)
      ).toEqual({ homeReturnCadence: 'flexible' });
    });
  });

  it('updateForUser 404 when offer not owned', async () => {
    mockCompanyLookup(52, 21);
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }));

    await expect(
      service.updateForUser('user-1', 'offer-missing', {
        ...baseDto,
        published: true,
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('deleteForUser', () => {
    function mockOwnedOffer() {
      from.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'offer-1', published: true },
                error: null,
              }),
            }),
          }),
        }),
      }));
    }

    function mockApplicationsProbe(rows: { id: string }[]) {
      from.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: async () => ({ data: rows, error: null }),
            }),
          }),
        }),
      }));
    }

    function mockOfferDelete(error: { message: string } | null = null) {
      from.mockImplementationOnce(() => ({
        delete: () => ({
          eq: () => ({
            eq: async () => ({ error }),
          }),
        }),
      }));
    }

    it('404 when offer not owned — no R2 purge / no DB delete', async () => {
      mockCompanyLookup(52, 21);
      from.mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }));

      await expect(
        service.deleteForUser('user-1', 'offer-missing')
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(deletePrivatePrefixOrThrow).not.toHaveBeenCalled();
      expect(from).toHaveBeenCalledTimes(2);
    });

    it('success with R2 configured — purge then DB delete', async () => {
      isPrivateConfigured.mockReturnValue(true);
      mockCompanyLookup(52, 21);
      mockOwnedOffer();
      mockOfferDelete();

      await service.deleteForUser('user-1', 'offer-1');

      expect(deletePrivatePrefixOrThrow).toHaveBeenCalledWith(
        'applications/company-1/offer-1'
      );
      expect(from).toHaveBeenCalledTimes(3);
    });

    it('R2 purge throw blocks DB delete', async () => {
      isPrivateConfigured.mockReturnValue(true);
      mockCompanyLookup(52, 21);
      mockOwnedOffer();
      deletePrivatePrefixOrThrow.mockRejectedValue(
        new InternalServerErrorException('Nie udało się usunąć plików CV')
      );

      await expect(service.deleteForUser('user-1', 'offer-1')).rejects.toBeInstanceOf(
        InternalServerErrorException
      );
      expect(from).toHaveBeenCalledTimes(2);
    });

    it('R2 unset + applications → 503, no DB delete', async () => {
      isPrivateConfigured.mockReturnValue(false);
      mockCompanyLookup(52, 21);
      mockOwnedOffer();
      mockApplicationsProbe([{ id: 'app-1' }]);

      await expect(service.deleteForUser('user-1', 'offer-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException
      );
      expect(deletePrivatePrefixOrThrow).not.toHaveBeenCalled();
      expect(from).toHaveBeenCalledTimes(3);
    });

    it('R2 unset + zero applications → DB delete without purge', async () => {
      isPrivateConfigured.mockReturnValue(false);
      mockCompanyLookup(52, 21);
      mockOwnedOffer();
      mockApplicationsProbe([]);
      mockOfferDelete();

      await service.deleteForUser('user-1', 'offer-1');

      expect(deletePrivatePrefixOrThrow).not.toHaveBeenCalled();
      expect(from).toHaveBeenCalledTimes(4);
    });
  });
});
