/** Field length limits — lock FE + Nest DTO + DB CHECKs together. */
export const APPLICATION_FIELD_LIMITS = {
  email: 254,
  phone: 32,
  message: 2000,
} as const;

export const APPLICATION_CV_MAX_BYTES = 5 * 1024 * 1024;

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
