import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CompanyJobApplicationListItem,
  CreateJobApplicationResponse,
} from '@baza/shared-types';
import { Readable } from 'stream';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

type ApplicationRow = {
  id: string;
  job_offer_id: string;
  company_id: string;
  email: string;
  phone: string;
  message: string | null;
  cv_file_key: string;
  consent_accepted_at: string;
  created_at: string;
};

type ListRow = {
  id: string;
  job_offer_id: string;
  email: string;
  phone: string;
  message: string | null;
  created_at: string;
  job_offers: { title: string } | { title: string }[] | null;
};

@Injectable()
export class JobApplicationService {
  private readonly logger = new Logger(JobApplicationService.name);

  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
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

    if (!this.r2.isPrivateConfigured()) {
      throw new ServiceUnavailableException(
        'Przesyłanie CV wymaga konfiguracji prywatnego R2'
      );
    }

    const offer = await this.requirePublishedOffer(offerId);
    const message =
      dto.message != null && dto.message.trim() !== ''
        ? dto.message.trim()
        : null;

    let uploaded: { key: string; prefix: string } | null = null;
    try {
      uploaded = await this.r2.uploadApplicationCv(
        offer.company_id,
        offer.id,
        cv.buffer,
        cv.mimetype
      );

      const consentAcceptedAt = new Date().toISOString();
      const { data, error } = await this.supabaseAuth
        .getClient()
        .from('job_applications')
        .insert({
          job_offer_id: offer.id,
          company_id: offer.company_id,
          email: dto.email.trim(),
          phone: dto.phone.trim(),
          message,
          cv_file_key: uploaded.key,
          consent_accepted_at: consentAcceptedAt,
        })
        .select(
          'id, job_offer_id, company_id, email, phone, message, created_at'
        )
        .single();

      if (error || !data) {
        this.logger.error(
          `job_applications insert failed: ${error?.message ?? 'no data'}`
        );
        throw new BadRequestException('Nie udało się zapisać aplikacji');
      }

      const row = data as Pick<
        ApplicationRow,
        'id' | 'job_offer_id' | 'email' | 'phone' | 'message' | 'created_at'
      >;

      return {
        id: row.id,
        jobOfferId: row.job_offer_id,
        email: row.email,
        phone: row.phone,
        ...(row.message ? { message: row.message } : {}),
        createdAt: row.created_at,
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
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_applications')
      .select(
        'id, job_offer_id, email, phone, message, created_at, job_offers(title)'
      )
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`job_applications list failed: ${error.message}`);
      throw new BadRequestException('Nie udało się pobrać aplikacji');
    }

    return ((data ?? []) as ListRow[]).map((row) => this.toListItem(row));
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
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_applications')
      .select('id, cv_file_key')
      .eq('id', applicationId)
      .eq('company_id', company.id)
      .maybeSingle();

    if (error) {
      this.logger.error(`job_applications cv lookup failed: ${error.message}`);
      throw new BadRequestException('Nie udało się pobrać aplikacji');
    }

    if (!data?.cv_file_key) {
      throw new NotFoundException('Nie znaleziono aplikacji');
    }

    const cvKey = data.cv_file_key as string;
    const expectedPrefix = `applications/${company.id}/`;
    if (!cvKey.startsWith(expectedPrefix)) {
      this.logger.error(
        `cv_file_key prefix mismatch for application ${applicationId} (company=${company.id})`
      );
      throw new NotFoundException('Nie znaleziono aplikacji');
    }

    return this.r2.getPrivateObject(cvKey);
  }

  private toListItem(row: ListRow): CompanyJobApplicationListItem {
    const offer = Array.isArray(row.job_offers)
      ? row.job_offers[0]
      : row.job_offers;
    return {
      id: row.id,
      jobOfferId: row.job_offer_id,
      jobOfferTitle: offer?.title?.trim() || '',
      email: row.email,
      phone: row.phone,
      ...(row.message ? { message: row.message } : {}),
      createdAt: row.created_at,
    };
  }

  private async requireCompanyForUser(
    userId: string
  ): Promise<{ id: string }> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Profil firmy nie znaleziony');
    }
    return { id: data.id as string };
  }

  private async requirePublishedOffer(
    offerId: string
  ): Promise<{ id: string; company_id: string }> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('id, company_id, published')
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      this.logger.error(`offer lookup failed: ${error.message}`);
      throw new BadRequestException('Nie udało się pobrać oferty');
    }

    if (!data || data.published !== true) {
      throw new NotFoundException('Oferta nie znaleziona');
    }

    return {
      id: data.id as string,
      company_id: data.company_id as string,
    };
  }
}
