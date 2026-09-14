import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { CompanyPublicService } from './company-public.service';

describe('CompanyPublicService', () => {
  let service: CompanyPublicService;
  const from = jest.fn();
  const getClient = jest.fn(() => ({ from }));

  const older = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Older Co',
    base_location: 'Krakow',
    photo_urls: null,
    created_at: '2026-01-01T00:00:00Z',
  };
  const newer = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Newer Co',
    base_location: 'Warsaw',
    photo_urls: {
      s48: 'https://acct.r2.cloudflarestorage.com/bucket/n48.webp',
    },
    created_at: '2026-06-01T00:00:00Z',
  };
  const zeroOffers = {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'No Offers Co',
    base_location: '',
    photo_urls: null,
    created_at: '2026-03-01T00:00:00Z',
  };

  beforeEach(async () => {
    from.mockReset();
    getClient.mockClear();
    delete process.env['R2_PUBLIC_URL'];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyPublicService,
        {
          provide: SupabaseAuthService,
          useValue: { getClient },
        },
      ],
    }).compile();

    service = module.get(CompanyPublicService);
  });

  afterEach(() => {
    delete process.env['R2_PUBLIC_URL'];
  });

  function mockListQueries(
    companies: unknown[] | null,
    companiesError: { message: string } | null,
    offers: unknown[] | null,
    offersError: { message: string } | null
  ) {
    const orderCalls: Array<[string, { ascending: boolean }]> = [];
    from.mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          select: () => ({
            order: (column: string, opts: { ascending: boolean }) => {
              orderCalls.push([column, opts]);
              return {
                order: (column2: string, opts2: { ascending: boolean }) => {
                  orderCalls.push([column2, opts2]);
                  return Promise.resolve({
                    data: companies,
                    error: companiesError,
                  });
                },
              };
            },
          }),
        };
      }
      if (table === 'job_offers') {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              expect(column).toBe('published');
              expect(value).toBe(true);
              return Promise.resolve({
                data: offers,
                error: offersError,
              });
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    return orderCalls;
  }

  it('returns all companies newest-first with published-only offerCount', async () => {
    process.env['R2_PUBLIC_URL'] = 'https://cdn.example';
    const orderCalls = mockListQueries(
      [newer, zeroOffers, older],
      null,
      [
        { company_id: newer.id },
        { company_id: newer.id },
        { company_id: older.id },
      ],
      null
    );

    const list = await service.list();

    expect(orderCalls).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(list).toEqual([
      {
        id: newer.id,
        name: 'Newer Co',
        baseLocation: 'Warsaw',
        photoUrls: { s48: 'https://cdn.example/bucket/n48.webp' },
        offerCount: 2,
      },
      {
        id: zeroOffers.id,
        name: 'No Offers Co',
        baseLocation: '',
        photoUrls: null,
        offerCount: 0,
      },
      {
        id: older.id,
        name: 'Older Co',
        baseLocation: 'Krakow',
        photoUrls: null,
        offerCount: 1,
      },
    ]);
    expect(list[0]).not.toHaveProperty('createdAt');
    expect(list[0]).not.toHaveProperty('created_at');
  });

  it('treats companies with only unpublished offers as offerCount 0', async () => {
    mockListQueries(
      [older],
      null,
      [],
      null
    );

    const list = await service.list();
    expect(list).toEqual([
      {
        id: older.id,
        name: 'Older Co',
        baseLocation: 'Krakow',
        photoUrls: null,
        offerCount: 0,
      },
    ]);
  });

  it('returns empty array when there are no companies', async () => {
    mockListQueries([], null, [], null);

    await expect(service.list()).resolves.toEqual([]);
  });

  it('throws when the companies query fails', async () => {
    mockListQueries(null, { message: 'boom' }, [], null);

    await expect(service.list()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the published-offers query fails', async () => {
    mockListQueries([older], null, null, { message: 'boom' });

    await expect(service.list()).rejects.toBeInstanceOf(BadRequestException);
  });
});
