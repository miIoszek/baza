export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MIN_DISTINCT_CHARACTERS = 4;

/**
 * Password policy in one pure function so registration, reset and change — on the API and in the
 * SPA forms — cannot drift apart. Length is the strongest factor; composition rules push users to
 * `Password1!` (NIST/OWASP no longer recommend them). Variety rules out `aaaaaaaaaa`; equality with
 * the email is a guess one public value away. The upper bound stops a megabyte "password" from
 * amplifying CPU against scrypt.
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
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return false;
  }
  if (new Set(password).size < PASSWORD_MIN_DISTINCT_CHARACTERS) {
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
