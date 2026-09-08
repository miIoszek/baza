import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { CompanyPublicProfile } from '@baza/shared-types';
import { CompanyPublicService } from './company-public.service';

@Controller('companies')
export class CompanyPublicController {
  constructor(private readonly companyPublic: CompanyPublicService) {}

  @Get(':id')
  getById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<CompanyPublicProfile> {
    return this.companyPublic.getById(id);
  }
}
