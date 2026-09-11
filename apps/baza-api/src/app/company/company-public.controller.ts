import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { CompanyPublicProfile, JobOffer } from '@baza/shared-types';
import { CompanyPublicService } from './company-public.service';
import { JobOfferService } from './job-offer.service';

@Controller('companies')
export class CompanyPublicController {
  constructor(
    private readonly companyPublic: CompanyPublicService,
    private readonly jobOfferService: JobOfferService
  ) {}

  @Get(':id/offers')
  listOffers(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<JobOffer[]> {
    return this.jobOfferService.listPublishedByCompany(id);
  }

  @Get(':id')
  getById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<CompanyPublicProfile> {
    return this.companyPublic.getById(id);
  }
}
