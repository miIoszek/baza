import {
  createStatefulSupabaseMock,
  listApplicationsForCompany,
} from './stateful-supabase.mock';

describe('stateful-supabase mock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds two companies and isolates applications by company_id on list', async () => {
    const mock = createStatefulSupabaseMock();
    mock.seedCompany({ id: 'company-a', user_id: 'user-a' });
    mock.seedCompany({ id: 'company-b', user_id: 'user-b' });
    mock.seedOffer({
      id: 'offer-a',
      company_id: 'company-a',
      published: true,
      title: 'Route A',
    });

    const client = mock.getClient();

    const { data: inserted } = await client
      .from('job_applications')
      .insert({
        job_offer_id: 'offer-a',
        company_id: 'company-a',
        email: 'driver@example.com',
        phone: '+48123456789',
        message: null,
        cv_file_key: 'applications/company-a/offer-a/v1/cv.pdf',
        consent_accepted_at: '2026-09-14T00:00:00.000Z',
      })
      .select(
        'id, job_offer_id, company_id, email, phone, message, created_at'
      )
      .single();

    expect(inserted).toMatchObject({
      id: expect.any(String),
      job_offer_id: 'offer-a',
      email: 'driver@example.com',
    });

    const listA = await client
      .from('job_applications')
      .select(
        'id, job_offer_id, email, phone, message, created_at, job_offers(title)'
      )
      .eq('company_id', 'company-a')
      .order('created_at', { ascending: false });

    const listB = await client
      .from('job_applications')
      .select(
        'id, job_offer_id, email, phone, message, created_at, job_offers(title)'
      )
      .eq('company_id', 'company-b')
      .order('created_at', { ascending: false });

    expect(listA.data).toHaveLength(1);
    expect(listA.data[0]).toMatchObject({
      id: (inserted as { id: string }).id,
      job_offers: { title: 'Route A' },
    });
    expect(listB.data).toEqual([]);

    expect(listApplicationsForCompany(mock.store, 'company-a')).toHaveLength(1);
    expect(listApplicationsForCompany(mock.store, 'company-b')).toHaveLength(0);
  });

  it('resolves company by user_id for owner lookup', async () => {
    const mock = createStatefulSupabaseMock();
    mock.seedCompany({ id: 'company-a', user_id: 'user-a' });

    const { data } = await mock
      .getClient()
      .from('companies')
      .select('id')
      .eq('user_id', 'user-a')
      .maybeSingle();

    expect(data).toEqual({ id: 'company-a' });
  });

  it('resolves published offer by id', async () => {
    const mock = createStatefulSupabaseMock();
    mock.seedOffer({
      id: 'offer-a',
      company_id: 'company-a',
      published: true,
      title: 'Published route',
    });

    const { data } = await mock
      .getClient()
      .from('job_offers')
      .select('id, company_id, published')
      .eq('id', 'offer-a')
      .maybeSingle();

    expect(data).toEqual({
      id: 'offer-a',
      company_id: 'company-a',
      published: true,
    });
  });

  it('filters CV lookup by application id and company_id', async () => {
    const mock = createStatefulSupabaseMock();
    mock.store.jobApplications.push({
      id: 'app-1',
      job_offer_id: 'offer-a',
      company_id: 'company-a',
      email: 'd@example.com',
      phone: '+48111',
      message: null,
      cv_file_key: 'applications/company-a/offer-a/v1/cv.pdf',
      consent_accepted_at: '2026-09-14T00:00:00.000Z',
      created_at: '2026-09-14T00:00:00.000Z',
    });

    const owned = await mock
      .getClient()
      .from('job_applications')
      .select('id, cv_file_key')
      .eq('id', 'app-1')
      .eq('company_id', 'company-a')
      .maybeSingle();

    const foreign = await mock
      .getClient()
      .from('job_applications')
      .select('id, cv_file_key')
      .eq('id', 'app-1')
      .eq('company_id', 'company-b')
      .maybeSingle();

    expect(owned.data).toEqual({
      id: 'app-1',
      cv_file_key: 'applications/company-a/offer-a/v1/cv.pdf',
    });
    expect(foreign.data).toBeNull();
  });
});
