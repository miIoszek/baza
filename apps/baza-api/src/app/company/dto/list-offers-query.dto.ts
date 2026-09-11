import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  COUNTRY_CODES,
  DRIVER_LICENSE_CODES,
  HOME_RETURN_CADENCES,
} from '@baza/shared-types';

/** Max length of a comma-joined allowlist (no duplicates required). */
const COUNTRIES_QUERY_MAX_LENGTH = COUNTRY_CODES.join(',').length;

const COUNTRIES_QUERY_PATTERN = new RegExp(
  `^(${COUNTRY_CODES.join('|')})(,(${COUNTRY_CODES.join('|')}))*$`
);

function toOptionalNumber(value: unknown): number | null | undefined {
  if (value === '' || value === undefined) {
    return value === undefined ? undefined : null;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : (value as unknown as number);
  }
  return value as number;
}

export class ListOffersQueryDto {
  /** Comma-separated ISO country codes from the shared allowlist. */
  @IsOptional()
  @IsString()
  @MaxLength(COUNTRIES_QUERY_MAX_LENGTH)
  @Transform(({ value }) => {
    if (value == null || value === '') {
      return undefined;
    }
    if (Array.isArray(value)) {
      value = value.join(',');
    }
    const parts = String(value)
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    return parts.length ? parts.join(',') : undefined;
  })
  @Matches(COUNTRIES_QUERY_PATTERN, {
    message: 'countries muszą być kodami ISO z listy dozwolonych krajów',
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
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  nearLat?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  nearLng?: number | null;
}
