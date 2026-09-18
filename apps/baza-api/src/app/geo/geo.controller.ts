import { Controller, Get } from '@nestjs/common';
import type { CountryCentroid } from '@baza/shared-types';
import { listCountryCentroids } from './country-centroids';
import { Public } from '../identity/decorators';

@Public()
@Controller('geo')
export class GeoController {
  @Get('countries')
  listCountries(): CountryCentroid[] {
    return listCountryCentroids();
  }
}
