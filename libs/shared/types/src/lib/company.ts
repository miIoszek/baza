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
  /** Manual map pin; null until set (Places later). */
  baseLat: number | null;
  baseLng: number | null;
  photoUrls: Record<string, string> | null;
}
