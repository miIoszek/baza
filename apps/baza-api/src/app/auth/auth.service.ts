import { DataSource } from 'typeorm';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Company, UserAccount } from '@baza/api-data-access';
import type {
  AuthMeCompany,
  RegisterCompanyResponse,
} from '@baza/shared-types';
import { COMPANY_ROLE, IDENTITY_CONFIG } from '../identity/identity.constants';
import type { IdentityConfig } from '../identity/identity.config';
import { LocalAuthService } from '../identity/services/local-auth.service';
import { UserAccountService } from '../identity/services/user-account.service';
import { rewriteR2PhotoUrls } from '../storage/photo-url.util';
import { R2StorageService } from '../storage/r2-storage.service';
import { RegisterCompanyDto } from './dto/register-company.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly accounts: UserAccountService,
    private readonly localAuth: LocalAuthService,
    private readonly r2: R2StorageService,
    @Inject(IDENTITY_CONFIG) private readonly config: IdentityConfig
  ) {}

  /**
   * Creates the account and its company in ONE transaction. The answer is identical whether or not
   * the address was already registered (the difference goes by email), so this endpoint is not an
   * account-enumeration oracle. The logo is uploaded after commit because its key uses the
   * company id; on failure the account is deleted (FK cascade removes the company) and R2 cleaned.
   */
  async register(
    dto: RegisterCompanyDto,
    photo?: Express.Multer.File
  ): Promise<RegisterCompanyResponse> {
    if (!dto.termsAccepted) {
      throw new BadRequestException('Terms must be accepted');
    }
    if (photo && !this.r2.isConfigured()) {
      throw new ServiceUnavailableException(
        'Photo upload requires R2 configuration'
      );
    }
    this.localAuth.assertPasswordPolicy(dto.password, dto.email);

    const response: RegisterCompanyResponse = {
      emailVerificationRequired: this.config.requireEmailVerification,
    };

    const created = await this.createAccountWithCompany(dto);
    if (!created) {
      await this.localAuth.sendAlreadyRegisteredNotice(dto.email);
      return response;
    }

    let photoKey: string | null = null;
    try {
      if (photo?.buffer?.length) {
        const uploaded = await this.r2.uploadCompanyLogo(
          created.companyId,
          photo.buffer,
          photo.mimetype || 'image/jpeg'
        );
        photoKey = uploaded.photoKey;
        await this.dataSource.getRepository(Company).update(
          { id: created.companyId },
          { photoKey: uploaded.photoKey, photoUrls: uploaded.photoUrls }
        );
      }
    } catch (err) {
      await this.compensateFailedRegister(created.account.id, photoKey);
      this.logger.warn(
        `Company photo step failed during register: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err instanceof BadRequestException
        ? err
        : new BadRequestException('Failed to create company profile');
    }

    if (this.config.requireEmailVerification) {
      await this.localAuth.sendVerificationEmail(created.account);
    }
    return response;
  }

  async getCompanyForUser(userId: string): Promise<AuthMeCompany | null> {
    let company: Company | null;
    try {
      company = await this.dataSource
        .getRepository(Company)
        .findOne({ where: { userId } });
    } catch (error) {
      this.logger.warn(
        `getCompanyForUser failed for ${userId}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Do not treat a failed query as "no company": that would make /auth/me look like a guest.
      throw new InternalServerErrorException('Failed to load company profile');
    }
    if (!company) {
      return null;
    }
    return {
      id: company.id,
      name: company.name,
      nip: company.nip,
      description: company.description,
      baseLocation: company.baseLocation,
      baseLat: company.baseLat ?? null,
      baseLng: company.baseLng ?? null,
      photoUrls: rewriteR2PhotoUrls(company.photoUrls ?? null),
    };
  }

  private async createAccountWithCompany(
    dto: RegisterCompanyDto
  ): Promise<{ account: UserAccount; companyId: string } | null> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const outcome = await this.accounts.registerLocal(
          {
            email: dto.email,
            password: dto.password,
            roles: [COMPANY_ROLE],
            emailVerified: !this.config.requireEmailVerification,
          },
          manager
        );
        if (outcome.kind === 'already-registered') {
          return null;
        }
        const company = await manager.getRepository(Company).save(
          manager.getRepository(Company).create({
            userId: outcome.account.id,
            name: dto.name,
            nip: dto.nip,
            description: dto.description,
            baseLocation: dto.baseLocation ?? '',
            photoKey: null,
            photoUrls: null,
          })
        );
        return { account: outcome.account, companyId: company.id };
      });
    } catch (error) {
      this.logger.warn(
        `Register transaction failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Failed to create company profile');
    }
  }

  private async compensateFailedRegister(
    userId: string,
    photoKey: string | null
  ): Promise<void> {
    if (photoKey) {
      await this.r2.deletePrefix(photoKey);
    }
    try {
      // FK cascade removes the company, tokens and sessions along with the account.
      await this.dataSource
        .getRepository(UserAccount)
        .delete({ id: userId });
    } catch (e) {
      const msg = `Compensation cleanup failed for user ${userId}: ${String(e)}`;
      this.logger.warn(msg);
      Sentry.captureException(e instanceof Error ? e : new Error(msg));
    }
  }
}
