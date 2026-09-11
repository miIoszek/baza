/** Field length limits — lock FE + Nest DTO + DB CHECKs together. */
export const APPLICATION_FIELD_LIMITS = {
  email: 254,
  phone: 32,
  message: 2000,
} as const;

export const APPLICATION_CV_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Phone: optional leading +, then digits with spaces / dashes / parentheses.
 * Digit count must be 9–15 (E.164).
 */
export const APPLICATION_PHONE_PATTERN =
  /^\+?[0-9][0-9\s()/.-]{7,30}$/;

export function isValidApplicationPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (
    trimmed.length < 3 ||
    trimmed.length > APPLICATION_FIELD_LIMITS.phone ||
    !APPLICATION_PHONE_PATTERN.test(trimmed)
  ) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
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
