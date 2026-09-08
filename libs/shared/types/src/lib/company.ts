export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Public company profile (S-01) — matches DB / AuthMeCompany field shapes. */
export interface CompanyPublicProfile {
  id: string;
  name: string;
  nip: string;
  description: string;
  baseLocation: string;
  photoUrls: Record<string, string> | null;
}
