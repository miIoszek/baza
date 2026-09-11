/** ISO 3166-1 alpha-2 country code. */
export type CountryCode = string;

export interface CountryOption {
  code: CountryCode;
  namePl: string;
}

/** Curated EU + common PL freight corridors (S-02 picker). */
export const COUNTRIES: readonly CountryOption[] = [
  { code: 'PL', namePl: 'Polska' },
  { code: 'DE', namePl: 'Niemcy' },
  { code: 'CZ', namePl: 'Czechy' },
  { code: 'SK', namePl: 'Słowacja' },
  { code: 'AT', namePl: 'Austria' },
  { code: 'HU', namePl: 'Węgry' },
  { code: 'LT', namePl: 'Litwa' },
  { code: 'LV', namePl: 'Łotwa' },
  { code: 'EE', namePl: 'Estonia' },
  { code: 'NL', namePl: 'Holandia' },
  { code: 'BE', namePl: 'Belgia' },
  { code: 'LU', namePl: 'Luksemburg' },
  { code: 'FR', namePl: 'Francja' },
  { code: 'IT', namePl: 'Włochy' },
  { code: 'ES', namePl: 'Hiszpania' },
  { code: 'PT', namePl: 'Portugalia' },
  { code: 'IE', namePl: 'Irlandia' },
  { code: 'DK', namePl: 'Dania' },
  { code: 'SE', namePl: 'Szwecja' },
  { code: 'FI', namePl: 'Finlandia' },
  { code: 'RO', namePl: 'Rumunia' },
  { code: 'BG', namePl: 'Bułgaria' },
  { code: 'HR', namePl: 'Chorwacja' },
  { code: 'SI', namePl: 'Słowenia' },
  { code: 'GR', namePl: 'Grecja' },
  { code: 'CY', namePl: 'Cypr' },
  { code: 'MT', namePl: 'Malta' },
  { code: 'UA', namePl: 'Ukraina' },
  { code: 'BY', namePl: 'Białoruś' },
  { code: 'RU', namePl: 'Rosja' },
  { code: 'TR', namePl: 'Turcja' },
  { code: 'GB', namePl: 'Wielka Brytania' },
  { code: 'CH', namePl: 'Szwajcaria' },
  { code: 'NO', namePl: 'Norwegia' },
  { code: 'RS', namePl: 'Serbia' },
  { code: 'BA', namePl: 'Bośnia i Hercegowina' },
  { code: 'MK', namePl: 'Macedonia Północna' },
  { code: 'MD', namePl: 'Mołdawia' },
  { code: 'AL', namePl: 'Albania' },
] as const;

export const COUNTRY_CODES: readonly CountryCode[] = COUNTRIES.map((c) => c.code);

export function isAllowedCountryCode(code: string): boolean {
  return COUNTRY_CODES.includes(code);
}

export function countryNamePl(code: string): string | undefined {
  return COUNTRIES.find((c) => c.code === code)?.namePl;
}
