import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { JobApplicationService } from './job-application.service';

describe('JobApplicationService', () => {
  let service: JobApplicationService;
  const from = jest.fn();
  const getClient = jest.fn(() => ({ from }));
  const uploadApplicationCv = jest.fn();
  const deletePrivatePrefix = jest.fn();
  const isPrivateConfigured = jest.fn(() => true);

  const pdf = {
    buffer: Buffer.from('%PDF-1.4 fake'),
    mimetype: 'application/pdf',
  } as Express.Multer.File;

  beforeEach(async () => {
    from.mockReset();
    uploadApplicationCv.mockReset();
    deletePrivatePrefix.mockReset();
    isPrivateConfigured.mockReset();
    isPrivateConfigured.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        {
          provide: SupabaseAuthService,
          useValue: { getClient },
        },
        {
          provide: R2StorageService,
          useValue: {
            isPrivateConfigured,
            uploadApplicationCv,
            deletePrivatePrefix,
          },
        },
      ],
    }).compile();

    service = module.get(JobApplicationService);
  });

  function mockPublishedOffer() {
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'offer-1',
              company_id: 'company-1',
              published: true,
            },
            error: null,
          }),
        }),
      }),
    }));
  }

  it('creates application without returning cv key', async () => {
    mockPublishedOffer();
    uploadApplicationCv.mockResolvedValue({
      key: 'applications/company-1/offer-1/v1/cv.pdf',
      prefix: 'applications/company-1/offer-1/v1',
    });
    from.mockImplementationOnce(() => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 'app-1',
              job_offer_id: 'offer-1',
              company_id: 'company-1',
              email: 'd@example.com',
              phone: '+48111',
              message: null,
              created_at: '2026-09-11T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    }));

    const result = await service.applyToPublishedOffer(
      'offer-1',
      {
        email: 'd@example.com',
        phone: '+48111',
        consentAccepted: true,
      },
      pdf
    );

    expect(result).toEqual({
      id: 'app-1',
      jobOfferId: 'offer-1',
      email: 'd@example.com',
      phone: '+48111',
      createdAt: '2026-09-11T00:00:00Z',
    });
    expect(result).not.toHaveProperty('cvFileKey');
    expect(deletePrivatePrefix).not.toHaveBeenCalled();
  });

  it('allows a second application for the same email (no unique constraint)', async () => {
    mockPublishedOffer();
    uploadApplicationCv.mockResolvedValue({
      key: 'applications/company-1/offer-1/v2/cv.pdf',
      prefix: 'applications/company-1/offer-1/v2',
    });
    from.mockImplementationOnce(() => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 'app-2',
              job_offer_id: 'offer-1',
              email: 'd@example.com',
              phone: '+48111',
              message: 'again',
              created_at: '2026-09-11T01:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    }));

    const result = await service.applyToPublishedOffer(
      'offer-1',
      {
        email: 'd@example.com',
        phone: '+48111',
        message: 'again',
        consentAccepted: true,
      },
      pdf
    );
    expect(result.id).toBe('app-2');
    expect(result.message).toBe('again');
  });

  it('404 when offer unpublished', async () => {
    from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'offer-1', company_id: 'c1', published: false },
            error: null,
          }),
        }),
      }),
    }));

    await expect(
      service.applyToPublishedOffer(
        'offer-1',
        { email: 'd@example.com', phone: '+48111', consentAccepted: true },
        pdf
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects missing CV file', async () => {
    await expect(
      service.applyToPublishedOffer(
        'offer-1',
        { email: 'd@example.com', phone: '+48111', consentAccepted: true },
        undefined
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cleans up R2 when DB insert fails', async () => {
    mockPublishedOffer();
    uploadApplicationCv.mockResolvedValue({
      key: 'applications/company-1/offer-1/v1/cv.pdf',
      prefix: 'applications/company-1/offer-1/v1',
    });
    from.mockImplementationOnce(() => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: null,
            error: { message: 'db down' },
          }),
        }),
      }),
    }));

    await expect(
      service.applyToPublishedOffer(
        'offer-1',
        { email: 'd@example.com', phone: '+48111', consentAccepted: true },
        pdf
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(deletePrivatePrefix).toHaveBeenCalledWith(
      'applications/company-1/offer-1/v1'
    );
  });

  it('fails when private R2 is not configured', async () => {
    isPrivateConfigured.mockReturnValue(false);
    await expect(
      service.applyToPublishedOffer(
        'offer-1',
        { email: 'd@example.com', phone: '+48111', consentAccepted: true },
        pdf
      )
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
