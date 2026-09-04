import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(10)
  nip!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  baseLocation!: string;

  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  termsAccepted!: boolean;
}
