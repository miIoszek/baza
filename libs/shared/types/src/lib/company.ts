export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CompanyPublicProfile {
  id: string;
  name: string;
  nip: string;
  description: string;
  photoUrl?: string;
  baseLocation: GeoPoint;
}

export interface CreateCompanyRequest {
  name: string;
  nip: string;
  description: string;
  photoUrl?: string;
  baseLocation: GeoPoint;
}
