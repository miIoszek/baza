import { Transform } from 'class-transformer';
import {
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
  EMPLOYMENT_FORM_CODES,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPE_CODES,
} from '@baza/shared-types';

/** Max length of a comma-joined allowlist (no duplicates required). */
const COUNTRIES_QUERY_MAX_LENGTH = COUNTRY_CODES.join(',').length;
const CADENCE_QUERY_MAX_LENGTH = HOME_RETURN_CADENCES.join(',').length;
const LICENSE_QUERY_MAX_LENGTH = DRIVER_LICENSE_CODES.join(',').length;
const TRANSPORT_QUERY_MAX_LENGTH = TRANSPORT_TYPE_CODES.join(',').length;
const EMPLOYMENT_QUERY_MAX_LENGTH = EMPLOYMENT_FORM_CODES.join(',').length;

function commaAllowlistPattern(codes: readonly string[]): RegExp {
  return new RegExp(`^(${codes.join('|')})(,(${codes.join('|')}))*$`);
}

const COUNTRIES_QUERY_PATTERN = commaAllowlistPattern(COUNTRY_CODES);
const CADENCE_QUERY_PATTERN = commaAllowlistPattern(HOME_RETURN_CADENCES);
const LICENSE_QUERY_PATTERN = commaAllowlistPattern(DRIVER_LICENSE_CODES);
const TRANSPORT_QUERY_PATTERN = commaAllowlistPattern(TRANSPORT_TYPE_CODES);
const EMPLOYMENT_QUERY_PATTERN = commaAllowlistPattern(EMPLOYMENT_FORM_CODES);

function transformCommaAllowlist(value: unknown): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    value = value.join(',');
  }
  const parts = String(value)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  return parts.length ? parts.join(',') : undefined;
}

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
  @Transform(({ value }) => transformCommaAllowlist(value))
  @Matches(COUNTRIES_QUERY_PATTERN, {
    message: 'countries muszą być kodami ISO z listy dozwolonych krajów',
  })
  countries?: string;

  /** Comma-separated home-return cadence codes. */
  @IsOptional()
  @IsString()
  @MaxLength(CADENCE_QUERY_MAX_LENGTH)
  @Transform(({ value }) => transformCommaAllowlist(value))
  @Matches(CADENCE_QUERY_PATTERN, {
    message: 'cadence musi być kodem z listy dozwolonych kadencji',
  })
  cadence?: string;

  /** Comma-separated driver license wire codes. */
  @IsOptional()
  @IsString()
  @MaxLength(LICENSE_QUERY_MAX_LENGTH)
  @Transform(({ value }) => transformCommaAllowlist(value))
  @Matches(LICENSE_QUERY_PATTERN, {
    message: 'license musi być kodem z listy dozwolonych kategorii',
  })
  license?: string;

  /** Comma-separated transport type codes. */
  @IsOptional()
  @IsString()
  @MaxLength(TRANSPORT_QUERY_MAX_LENGTH)
  @Transform(({ value }) => transformCommaAllowlist(value))
  @Matches(TRANSPORT_QUERY_PATTERN, {
    message: 'transport musi być kodem z listy dozwolonych typów',
  })
  transport?: string;

  /** Comma-separated employment form codes. Product field is employmentForms. */
  @IsOptional()
  @IsString()
  @MaxLength(EMPLOYMENT_QUERY_MAX_LENGTH)
  @Transform(({ value }) => transformCommaAllowlist(value))
  @Matches(EMPLOYMENT_QUERY_PATTERN, {
    message: 'employment musi być kodem z listy dozwolonych form zatrudnienia',
  })
  employment?: string;

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
