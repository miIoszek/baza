import { HttpException, HttpStatus } from '@nestjs/common';

/** Stable machine-readable codes; the SPA switches on `code`, never on `message`. */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  FORBIDDEN_ORIGIN = 'FORBIDDEN_ORIGIN',
}

const STATUS: Record<AuthErrorCode, HttpStatus> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [AuthErrorCode.ACCOUNT_LOCKED]: HttpStatus.TOO_MANY_REQUESTS,
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: HttpStatus.FORBIDDEN,
  [AuthErrorCode.INVALID_TOKEN]: HttpStatus.BAD_REQUEST,
  [AuthErrorCode.WEAK_PASSWORD]: HttpStatus.BAD_REQUEST,
  [AuthErrorCode.SESSION_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [AuthErrorCode.FORBIDDEN_ORIGIN]: HttpStatus.FORBIDDEN,
};

const MESSAGE: Record<AuthErrorCode, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Nieprawidłowy email lub hasło',
  [AuthErrorCode.ACCOUNT_LOCKED]:
    'Konto jest tymczasowo zablokowane po zbyt wielu próbach logowania',
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: 'Potwierdź adres email, aby się zalogować',
  [AuthErrorCode.INVALID_TOKEN]: 'Link jest nieprawidłowy lub wygasł',
  [AuthErrorCode.WEAK_PASSWORD]:
    'Hasło musi mieć 10-128 znaków, co najmniej 4 różne znaki i nie może być równe adresowi email',
  [AuthErrorCode.SESSION_EXPIRED]: 'Sesja wygasła, zaloguj się ponownie',
  [AuthErrorCode.FORBIDDEN_ORIGIN]: 'Niedozwolone źródło żądania',
};

export class AuthException extends HttpException {
  constructor(readonly code: AuthErrorCode) {
    super(
      { statusCode: STATUS[code], code, message: MESSAGE[code] },
      STATUS[code]
    );
  }
}
