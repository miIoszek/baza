import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  COUNTRY_CODES,
  DRIVER_LICENSE_CODES,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPE_CODES,
} from '@baza/shared-types';

export class RouteCountryDto {
  @IsString()
  @IsIn([...COUNTRY_CODES])
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class RouteDirectionDto {
  @ValidateNested()
  @Type(() => RouteCountryDto)
  from!: RouteCountryDto;

  @ValidateNested()
  @Type(() => RouteCountryDto)
  to!: RouteCountryDto;
}

export class CreateJobOfferDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @IsIn([...HOME_RETURN_CADENCES])
  homeReturnCadence!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredYearsExperience!: number;

  @IsString()
  @IsIn([...TRANSPORT_TYPE_CODES])
  requiredTransportType!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RouteDirectionDto)
  routes!: RouteDirectionDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryMax?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @MinLength(3)
  salaryCurrency?: string | null;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  /** Optional until company-form phase — Phase 3 makes this required. */
  @IsString()
  @IsIn([...DRIVER_LICENSE_CODES])
  licenseCategory!: string;
}

export class UpdateJobOfferDto extends CreateJobOfferDto {
  @IsBoolean()
  override published!: boolean;
}
