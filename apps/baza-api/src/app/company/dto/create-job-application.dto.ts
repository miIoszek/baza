import {
  Equals,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  APPLICATION_FIELD_LIMITS,
  APPLICATION_PHONE_PATTERN,
  isValidApplicationPhone,
} from '@baza/shared-types';

function toConsentAccepted(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

@ValidatorConstraint({ name: 'applicationPhone', async: false })
class ApplicationPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidApplicationPhone(value);
  }

  defaultMessage(): string {
    return 'Podaj prawidłowy numer telefonu';
  }
}

export class CreateJobApplicationDto {
  @IsEmail({}, { message: 'Podaj prawidłowy adres e-mail' })
  @MaxLength(APPLICATION_FIELD_LIMITS.email)
  email!: string;

  @IsString()
  @MinLength(9, { message: 'Podaj prawidłowy numer telefonu' })
  @MaxLength(APPLICATION_FIELD_LIMITS.phone)
  @Matches(APPLICATION_PHONE_PATTERN, {
    message: 'Podaj prawidłowy numer telefonu',
  })
  @Validate(ApplicationPhoneConstraint)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(APPLICATION_FIELD_LIMITS.message)
  message?: string;

  @Transform(({ value }) => toConsentAccepted(value))
  @Equals(true, { message: 'Wymagana jest zgoda na przetwarzanie danych' })
  consentAccepted!: true;
}
