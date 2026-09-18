import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'NIP must be exactly 10 digits' })
  nip!: string;

  @IsEmail()
  email!: string;

  /** Strength is enforced by the shared password policy (WEAK_PASSWORD), not duplicated here. */
  @IsString()
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  baseLocation!: string;

  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  termsAccepted!: boolean;
}
