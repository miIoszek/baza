import { ConflictException } from '@nestjs/common';
import {
  JobApplication,
  JobOffer as JobOfferEntity,
} from '@baza/api-data-access';
import { DUPLICATE_APPLICATION_MESSAGE } from '@baza/shared-types';
import type { R2StorageService } from '../storage/r2-storage.service';
import type { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { JobApplicationService } from './job-application.service';

describe('JobApplicationService.applyToPublishedOffer', () => {
  const offer = { id: 'offer-1', companyId: 'company-1', published: true };
  const dto = {
    email: '  Jan@Example.com ',
    phone: '+48 600 100 200',
    consentAccepted: true,
  } as CreateJobApplicationDto;
  const cv = {
    buffer: Buffer.from('%PDF-1.4'),
    mimetype: 'application/pdf',
    originalname: 'C:\\fakepath\\CV Łukasz.pdf',
  } as Express.Multer.File;

  function setup(duplicate: boolean) {
    const where = jest.fn();
    const andWhere = jest.fn();
    const queryBuilder = {
      where: where.mockReturnThis(),
      andWhere: andWhere.mockReturnThis(),
      getExists: jest.fn().mockResolvedValue(duplicate),
    };
    const save = jest.fn(async (row: Record<string, unknown>) => ({
      ...row,
      id: 'application-1',
      createdAt: new Date('2026-09-23T10:00:00Z'),
    }));
    const applications = {
      createQueryBuilder: () => queryBuilder,
      create: (row: Record<string, unknown>) => row,
      save,
    };
    const offers = { findOne: jest.fn().mockResolvedValue(offer) };
    const dataSource = {
      getRepository: (entity: unknown) =>
        entity === JobApplication ? applications : entity === JobOfferEntity ? offers : null,
    };
    const r2 = {
      isPrivateConfigured: () => true,
      uploadApplicationCv: jest
        .fn()
        .mockResolvedValue({ key: 'applications/company-1/offer-1/cv.pdf', prefix: 'p' }),
      deletePrivatePrefix: jest.fn(),
    };
    const service = new JobApplicationService(
      dataSource as never,
      r2 as unknown as R2StorageService
    );
    return { service, r2, save, andWhere };
  }

  it('rejects a repeat e-mail with 409 before uploading the CV', async () => {
    const { service, r2, save, andWhere } = setup(true);
    const attempt = service.applyToPublishedOffer(offer.id, dto, cv);
    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow(DUPLICATE_APPLICATION_MESSAGE);
    expect(andWhere).toHaveBeenCalledWith('lower(application.email) = lower(:email)', {
      email: 'Jan@Example.com',
    });
    expect(r2.uploadApplicationCv).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('stores a first application with the sanitized CV file name', async () => {
    const { service, r2, save } = setup(false);
    const res = await service.applyToPublishedOffer(offer.id, dto, cv);
    expect(r2.uploadApplicationCv).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'Jan@Example.com',
        cvFileName: 'CV Łukasz.pdf',
      })
    );
    expect(res.id).toBe('application-1');
  });
});
