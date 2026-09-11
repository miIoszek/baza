import { Type, Transform } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  DRIVER_LICENSE_CODES,
  HOME_RETURN_CADENCES,
} from '@baza/shared-types';

export class ListOffersQueryDto {
  /** Comma-separated ISO country codes. */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (value == null || value === '') {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.join(',');
    }
    return String(value);
  })
  countries?: string;

  @IsOptional()
  @IsString()
  @IsIn([...HOME_RETURN_CADENCES])
  cadence?: string;

  @IsOptional()
  @IsString()
  @IsIn([...DRIVER_LICENSE_CODES])
  license?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  nearLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  nearLng?: number;
}
