import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { CompanyController } from './company.controller';
import { CompanyPublicController } from './company-public.controller';
import { CompanyPublicService } from './company-public.service';
import { CompanyService } from './company.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [CompanyController, CompanyPublicController],
  providers: [CompanyPublicService, CompanyService],
})
export class CompanyModule {}
