import { Readable } from 'stream';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Company,
  JobApplication,
  JobOffer as JobOfferEntity,
} from '@baza/api-data-access';
import {
  DUPLICATE_APPLICATION_MESSAGE,
  type CompanyJobApplicationListItem,
  type CreateJobApplicationResponse,
} from '@baza/shared-types';
import { R2StorageService } from '../storage/r2-storage.service';
import { sanitizeCvFileName } from './cv-file-name';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

@Injectable()
export class JobApplicationService {
  private readonly logger = new Logger(JobApplicationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2StorageService
  ) {}

  async applyToPublishedOffer(
    offerId: string,
    dto: CreateJobApplicationDto,
    cv?: Express.Multer.File
  ): Promise<CreateJobApplicationResponse> {
    if (!cv?.buffer?.length) {
      throw new BadRequestException('Dołącz plik CV (PDF)');
    }

    const offer = await this.requirePublishedOffer(offerId);
    const email = dto.email.trim();
    // Before storage: a repeat must not upload a CV nobody will ever read.
    await this.rejectDuplicate(offer.id, email);

    if (!this.r2.isPrivateConfigured()) {
      throw new ServiceUnavailableException(
        'Przesyłanie CV wymaga konfiguracji prywatnego R2'
      );
    }

    const message =
      dto.message != null && dto.message.trim() !== ''
        ? dto.message.trim()
        : null;

    let uploaded: { key: string; prefix: string } | null = null;
    try {
      uploaded = await this.r2.uploadApplicationCv(
        offer.companyId,
        offer.id,
        cv.buffer,
        cv.mimetype
      );

      let row: JobApplication;
      try {
        const applications = this.dataSource.getRepository(JobApplication);
        row = await applications.save(
          applications.create({
            jobOfferId: offer.id,
            companyId: offer.companyId,
            email,
            phone: dto.phone.trim(),
            message,
            cvFileKey: uploaded.key,
            cvFileName: sanitizeCvFileName(cv.originalname),
            consentAcceptedAt: new Date(),
          })
        );
      } catch (error) {
        this.logger.error(
          `job_applications insert failed: ${error instanceof Error ? error.message : String(error)}`
        );
        throw new BadRequestException('Nie udało się zapisać aplikacji');
      }

      return {
        id: row.id,
        jobOfferId: row.jobOfferId,
        email: row.email,
        phone: row.phone,
        ...(row.message ? { message: row.message } : {}),
        createdAt: row.createdAt.toISOString(),
      };
    } catch (err) {
      if (uploaded) {
        await this.r2.deletePrivatePrefix(uploaded.prefix);
      }
      throw err;
    }
  }

  async listForOwner(userId: string): Promise<CompanyJobApplicationListItem[]> {
    const company = await this.requireCompanyForUser(userId);
    try {
      const rows = await this.dataSource.getRepository(JobApplication).find({
        where: { companyId: company.id },
        relations: { jobOffer: true },
        order: { createdAt: 'DESC' },
      });
      return rows.map((row) => ({
        id: row.id,
        jobOfferId: row.jobOfferId,
        jobOfferTitle: row.jobOffer?.title?.trim() || '',
        email: row.email,
        phone: row.phone,
        ...(row.message ? { message: row.message } : {}),
        cvFileName: row.cvFileName ?? null,
        createdAt: row.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(
        `job_applications list failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Nie udało się pobrać aplikacji');
    }
  }

  async getCvStreamForOwner(
    userId: string,
    applicationId: string
  ): Promise<{
    body: Readable;
    contentType?: string;
    contentLength?: number;
  }> {
    if (!this.r2.isPrivateConfigured()) {
      throw new ServiceUnavailableException(
        'Pobieranie CV wymaga konfiguracji prywatnego R2'
      );
    }

    const company = await this.requireCompanyForUser(userId);
    let application: Pick<JobApplication, 'id' | 'cvFileKey'> | null;
    try {
      application = await this.dataSource
        .getRepository(JobApplication)
        .findOne({
          where: { id: applicationId, companyId: company.id },
          select: { id: true, cvFileKey: true },
        });
    } catch (error) {
      this.logger.error(
        `job_applications cv lookup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Nie udało się pobrać aplikacji');
    }

    if (!application?.cvFileKey) {
      throw new NotFoundException('Nie znaleziono aplikacji');
    }

    const cvKey = application.cvFileKey;
    const expectedPrefix = `applications/${company.id}/`;
    if (!cvKey.startsWith(expectedPrefix)) {
      this.logger.error(
        `cv_file_key prefix mismatch for application ${applicationId} (company=${company.id})`
      );
      throw new NotFoundException('Nie znaleziono aplikacji');
    }

    return this.r2.getPrivateObject(cvKey);
  }

  /**
   * One application per e-mail per offer: the company keeps the first one.
   * Case-insensitive, so `Jan@x.pl` and `jan@x.pl` count as the same address.
   */
  private async rejectDuplicate(offerId: string, email: string): Promise<void> {
    let exists: boolean;
    try {
      exists = await this.dataSource
        .getRepository(JobApplication)
        .createQueryBuilder('application')
        .where('application.job_offer_id = :offerId', { offerId })
        .andWhere('lower(application.email) = lower(:email)', { email })
        .getExists();
    } catch (error) {
      this.logger.error(
        `job_applications duplicate lookup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Nie udało się zapisać aplikacji');
    }
    if (exists) {
      throw new ConflictException(DUPLICATE_APPLICATION_MESSAGE);
    }
  }

  private async requireCompanyForUser(
    userId: string
  ): Promise<{ id: string }> {
    const company = await this.dataSource.getRepository(Company).findOne({
      where: { userId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Profil firmy nie znaleziony');
    }
    return company;
  }

  private async requirePublishedOffer(
    offerId: string
  ): Promise<{ id: string; companyId: string }> {
    let offer: Pick<JobOfferEntity, 'id' | 'companyId' | 'published'> | null;
    try {
      offer = await this.dataSource.getRepository(JobOfferEntity).findOne({
        where: { id: offerId },
        select: { id: true, companyId: true, published: true },
      });
    } catch (error) {
      this.logger.error(
        `offer lookup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Nie udało się pobrać oferty');
    }

    if (!offer || offer.published !== true) {
      throw new NotFoundException('Oferta nie znaleziona');
    }
    return { id: offer.id, companyId: offer.companyId };
  }
}
