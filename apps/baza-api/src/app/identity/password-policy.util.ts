import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './identity.constants';

const MIN_DISTINCT_CHARACTERS = 4;

/**
 * Password policy in one pure function so registration, reset and change cannot drift apart.
 * Length is the strongest factor; composition rules push users to `Password1!` (NIST/OWASP no longer
 * recommend them). Variety rules out `aaaaaaaaaa`; equality with the email is a guess one public
 * value away. The upper bound stops a megabyte "password" from amplifying CPU against scrypt.
 *
 * The candidate is never trimmed: leading/trailing spaces are legitimate password characters.
 */
export function isAcceptablePassword(
  password: unknown,
  email?: string | null
): boolean {
  if (typeof password !== 'string') {
    return false;
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return false;
  }
  if (new Set(password).size < MIN_DISTINCT_CHARACTERS) {
    return false;
  }
  if (!email) {
    return true;
  }
  const candidate = password.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  return (
    candidate !== normalizedEmail && candidate !== normalizedEmail.split('@')[0]
  );
}
