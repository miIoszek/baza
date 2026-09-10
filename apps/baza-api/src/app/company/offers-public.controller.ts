import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { JobOffer } from '@baza/shared-types';
import { JobOfferService } from './job-offer.service';

@Controller('offers')
export class OffersPublicController {
  constructor(private readonly jobOfferService: JobOfferService) {}

  @Get()
  list(): Promise<JobOffer[]> {
    return this.jobOfferService.listPublished();
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<JobOffer> {
    return this.jobOfferService.getPublishedById(id);
  }
}
