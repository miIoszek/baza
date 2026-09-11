import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { JobOffer } from '@baza/shared-types';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { CreateJobOfferDto } from './dto/job-offer.dto';
import { JobOfferService } from './job-offer.service';

describe('JobOfferService', () => {
  let service: JobOfferService;
  const from = jest.fn();
  const getClient = jest.fn(() => ({ from }));

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
    published: true,
    publishedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    from.mockReset();
    getClient.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferService,
        {
          provide: SupabaseAuthService,
          useValue: { getClient },
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
});
