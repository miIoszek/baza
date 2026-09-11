import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import type {
  CreateJobApplicationResponse,
  JobOffer,
} from '@baza/shared-types';
import { APPLICATION_CV_MAX_BYTES } from '@baza/shared-types';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { JobApplicationService } from './job-application.service';
import { JobOfferService } from './job-offer.service';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';

@Controller('offers')
export class OffersPublicController {
  constructor(
    private readonly jobOfferService: JobOfferService,
    private readonly jobApplicationService: JobApplicationService
  ) {}

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

  @Post(':id/applications')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: { fileSize: APPLICATION_CV_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(
            new BadRequestException(
              'Dozwolone są tylko pliki PDF'
            ) as unknown as Error,
            false
          );
          return;
        }
        cb(null, true);
      },
    })
  )
  apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateJobApplicationDto,
    @UploadedFile() cv?: Express.Multer.File
  ): Promise<CreateJobApplicationResponse> {
    return this.jobApplicationService.applyToPublishedOffer(id, dto, cv);
  }
}
