import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompanyController } from './company.controller';
import { CompanyPublicController } from './company-public.controller';
import { CompanyPublicService } from './company-public.service';

@Module({
  imports: [AuthModule],
  controllers: [CompanyController, CompanyPublicController],
  providers: [CompanyPublicService],
})
export class CompanyModule {}
