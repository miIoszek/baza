import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import type { JobOffer } from '@baza/shared-types';
import { JobOfferService } from './job-offer.service';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';

@Controller('offers')
export class OffersPublicController {
  constructor(private readonly jobOfferService: JobOfferService) {}

  @Get()
  list(@Query() query: ListOffersQueryDto): Promise<JobOffer[]> {
    return this.jobOfferService.listPublished(
      this.jobOfferService.parseListQuery(query)
    );
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<JobOffer> {
    return this.jobOfferService.getPublishedById(id);
  }
}
