import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { createStatefulSupabaseMock } from '../../testing/stateful-supabase.mock';
import { JobApplicationService } from './job-application.service';

describe('JobApplicationService integration (apply → inbox + CV)', () => {
  let service: JobApplicationService;
  let supabase: ReturnType<typeof createStatefulSupabaseMock>;
  const uploadApplicationCv = jest.fn();
  const deletePrivatePrefix = jest.fn();
  const getPrivateObject = jest.fn();
  const isPrivateConfigured = jest.fn(() => true);

  const pdf = {
    buffer: Buffer.from('%PDF-1.4 fake'),
    mimetype: 'application/pdf',
  } as Express.Multer.File;

  beforeEach(async () => {
    supabase = createStatefulSupabaseMock();
    supabase.seedCompany({ id: 'company-a', user_id: 'user-a' });
    supabase.seedCompany({ id: 'company-b', user_id: 'user-b' });
    supabase.seedOffer({
      id: 'offer-a',
      company_id: 'company-a',
      published: true,
      title: 'Route Warsaw–Berlin',
    });

    uploadApplicationCv.mockReset();
    deletePrivatePrefix.mockReset();
    getPrivateObject.mockReset();
    isPrivateConfigured.mockReset();
    isPrivateConfigured.mockReturnValue(true);
    uploadApplicationCv.mockResolvedValue({
      key: 'applications/company-a/offer-a/v1/cv.pdf',
      prefix: 'applications/company-a/offer-a/v1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        {
          provide: SupabaseAuthService,
          useValue: { getClient: supabase.getClient },
        },
        {
          provide: R2StorageService,
          useValue: {
            isPrivateConfigured,
            uploadApplicationCv,
            deletePrivatePrefix,
            getPrivateObject,
          },
        },
      ],
    }).compile();

    service = module.get(JobApplicationService);
  });

  it('owning company lists the application after apply (Risk #1 apply→inbox)', async () => {
    const applyResult = await service.applyToPublishedOffer(
      'offer-a',
      {
        email: 'driver@example.com',
        phone: '+48123456789',
        message: 'Interested',
        consentAccepted: true,
      },
      pdf
    );

    expect(applyResult.id).toEqual(expect.any(String));
    expect(applyResult.email).toBe('driver@example.com');
    expect(applyResult.phone).toBe('+48123456789');
    expect(applyResult).not.toHaveProperty('cvFileKey');
    expect(applyResult).not.toHaveProperty('cv_file_key');

    expect(uploadApplicationCv).toHaveBeenCalledWith(
      'company-a',
      'offer-a',
      pdf.buffer,
      pdf.mimetype
    );

    const inboxA = await service.listForOwner('user-a');
    const inboxB = await service.listForOwner('user-b');

    const matchA = inboxA.find((item) => item.id === applyResult.id);
    expect(matchA).toEqual(
      expect.objectContaining({
        id: applyResult.id,
        jobOfferId: 'offer-a',
        jobOfferTitle: 'Route Warsaw–Berlin',
        email: 'driver@example.com',
        phone: '+48123456789',
        message: 'Interested',
      })
    );
    expect(matchA).not.toHaveProperty('cvFileKey');
    expect(matchA).not.toHaveProperty('cv_file_key');

    expect(inboxB.some((item) => item.id === applyResult.id)).toBe(false);
    expect(supabase.listApplicationsForCompany('company-a')).toHaveLength(1);
    expect(supabase.listApplicationsForCompany('company-b')).toHaveLength(0);
  });

  it('company B cannot download company A CV after apply (Risk #2 cross-tenant)', async () => {
    const applyResult = await service.applyToPublishedOffer(
      'offer-a',
      {
        email: 'driver@example.com',
        phone: '+48123456789',
        consentAccepted: true,
      },
      pdf
    );

    await expect(
      service.getCvStreamForOwner('user-b', applyResult.id)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(getPrivateObject).not.toHaveBeenCalled();
  });

  it('owning company streams CV after apply (Risk #2 happy path)', async () => {
    const applyResult = await service.applyToPublishedOffer(
      'offer-a',
      {
        email: 'driver@example.com',
        phone: '+48123456789',
        consentAccepted: true,
      },
      pdf
    );

    const body = Readable.from([Buffer.from('%PDF-1.4')]);
    getPrivateObject.mockResolvedValue({
      body,
      contentType: 'application/pdf',
      contentLength: 8,
    });

    const stream = await service.getCvStreamForOwner('user-a', applyResult.id);
    expect(getPrivateObject).toHaveBeenCalledWith(
      'applications/company-a/offer-a/v1/cv.pdf'
    );
    expect(stream.body).toBe(body);
    expect(stream.contentType).toBe('application/pdf');
  });
});
