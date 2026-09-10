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
