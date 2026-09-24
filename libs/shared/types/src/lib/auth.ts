/** Response for GET /api/auth/me */
export interface AuthMeUser {
  id: string;
  email: string | null;
}

export interface AuthMeCompany {
  id: string;
  name: string;
  nip: string;
  description: string;
  baseLocation: string;
  baseLat: number | null;
  baseLng: number | null;
  photoUrls: Record<string, string> | null;
}

export interface AuthMeResponse {
  user: AuthMeUser;
  company: AuthMeCompany | null;
}

/** Response of POST /api/auth/login, /refresh and /change-password. The refresh token is cookie-only. */
export interface AuthSessionResponse {
  accessToken: string;
  expiresInSeconds: number;
}

/**
 * Response of POST /api/auth/register (202). Deliberately identical whether or not the address was
 * already registered (no account-enumeration oracle).
 */
export interface RegisterCompanyResponse {
  emailVerificationRequired: boolean;
}
