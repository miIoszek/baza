import { Controller, Get, Header, Query } from '@nestjs/common';
import type { CountryCentroid, LocalitySuggestion } from '@baza/shared-types';
import { listCountryCentroids } from './country-centroids';
import { LocalitySearchQueryDto } from './locality-search-query.dto';
import { searchLocalities } from './pl-localities';
import { Public } from '../identity/decorators';

@Controller('geo')
export class GeoController {
  @Public()
  @Get('countries')
  listCountries(): CountryCentroid[] {
    return listCountryCentroids();
  }

  /** Base-address pin in the company profile; signed-in only, like the rest of the panel. */
  @Get('localities')
  @Header('Cache-Control', 'private, max-age=86400')
  searchLocalities(@Query() query: LocalitySearchQueryDto): LocalitySuggestion[] {
    return searchLocalities(query.q);
  }
}
