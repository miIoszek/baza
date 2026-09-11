import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

function emptyToNull(value: unknown): unknown {
  if (value === '' || value === undefined) {
    return null;
  }
  return value;
}

function toOptionalNumber(value: unknown): number | null | undefined {
  const v = emptyToNull(value);
  if (v === null) {
    return null;
  }
  if (typeof v === 'number') {
    return v;
  }
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : (v as unknown as number);
  }
  return v as number;
}

export class UpdateCompanyProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'NIP must be exactly 10 digits' })
  nip!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  baseLocation!: string;

  @Transform(({ value }) => toOptionalNumber(value))
  @ValidateIf((_, o?: UpdateCompanyProfileDto) => o?.baseLng != null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  baseLat?: number | null;

  @Transform(({ value }) => toOptionalNumber(value))
  @ValidateIf((_, o?: UpdateCompanyProfileDto) => o?.baseLat != null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  baseLng?: number | null;
}
