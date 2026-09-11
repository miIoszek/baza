/** Field length limits — lock FE + Nest DTO + DB CHECKs together. */
export const APPLICATION_FIELD_LIMITS = {
  email: 254,
  /** National 9 digits + optional country code / light formatting (e.g. +48 123 456 789). */
  phone: 16,
  message: 2000,
} as const;

export const APPLICATION_CV_MAX_BYTES = 5 * 1024 * 1024;

/** Digit count after stripping non-digits (national 9 … E.164 max 15). */
export const APPLICATION_PHONE_DIGIT_MIN = 9;
export const APPLICATION_PHONE_DIGIT_MAX = 15;

/**
 * Phone: optional leading +, then digits with spaces / dashes / parentheses.
 * Digit count must be 9–15; total length ≤ APPLICATION_FIELD_LIMITS.phone.
 */
export const APPLICATION_PHONE_PATTERN =
  /^\+?[0-9][0-9\s()/.-]{7,14}$/;

export function isValidApplicationPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (
    trimmed.length < APPLICATION_PHONE_DIGIT_MIN ||
    trimmed.length > APPLICATION_FIELD_LIMITS.phone ||
    !APPLICATION_PHONE_PATTERN.test(trimmed)
  ) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, '');
  return (
    digits.length >= APPLICATION_PHONE_DIGIT_MIN &&
    digits.length <= APPLICATION_PHONE_DIGIT_MAX
  );
}

/** Internal / company-facing application row (S-05). */
export interface JobApplication {
  id: string;
  jobOfferId: string;
  companyId: string;
  email: string;
  phone: string;
  /** Private storage key — never expose on public create response. */
  cvFileKey: string;
  message?: string;
  consentAcceptedAt: string;
  createdAt: string;
}

/** Driver apply form fields (CV is multipart file, not JSON). */
export interface CreateJobApplicationRequest {
  email: string;
  phone: string;
  message?: string;
  /**
   * Multipart may send string `'true'` / `'1'` or boolean `true`.
   * Only these values count as accepted consent.
   */
  consentAccepted: true;
}

/** Public create response — no CV URL/key. */
export interface CreateJobApplicationResponse {
  id: string;
  jobOfferId: string;
  email: string;
  phone: string;
  message?: string;
  createdAt: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}
