import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { CompanyController } from './company.controller';
import { CompanyPublicController } from './company-public.controller';
import { CompanyPublicService } from './company-public.service';
import { CompanyService } from './company.service';
import { JobOfferService } from './job-offer.service';
import { OffersPublicController } from './offers-public.controller';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [
    CompanyController,
    CompanyPublicController,
    OffersPublicController,
  ],
  providers: [CompanyPublicService, CompanyService, JobOfferService],
})
export class CompanyModule {}
