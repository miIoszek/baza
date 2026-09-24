import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from '../identity.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email!: string;

  /** Never trimmed; length-capped so it cannot amplify scrypt cost. */
  @IsString()
  @MaxLength(MAX_PASSWORD_LENGTH)
  password!: string;
}

export class EmailDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email!: string;
}

export class TokenDto {
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MaxLength(MAX_PASSWORD_LENGTH)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(MAX_PASSWORD_LENGTH)
  currentPassword!: string;

  @IsString()
  @MaxLength(MAX_PASSWORD_LENGTH)
  newPassword!: string;
}
