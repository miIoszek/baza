import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { APPLICATION_FIELD_LIMITS } from '@baza/shared-types';

function toConsentAccepted(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

export class CreateJobApplicationDto {
  @IsEmail({}, { message: 'Podaj prawidłowy adres e-mail' })
  @MaxLength(APPLICATION_FIELD_LIMITS.email)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(APPLICATION_FIELD_LIMITS.phone)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(APPLICATION_FIELD_LIMITS.message)
  message?: string;

  @Transform(({ value }) => toConsentAccepted(value))
  @Equals(true, { message: 'Wymagana jest zgoda na przetwarzanie danych' })
  consentAccepted!: true;
}
