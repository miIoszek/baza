import {
  COUNTRIES,
  DRIVER_LICENSES,
  EMPLOYMENT_FORMS,
  TRANSPORT_TYPES,
} from '@baza/shared-types';
import { pluralPl } from '../../core/polish-plural';

export interface OfferFiltersVm {
  routeCountries: string[];
  cadences: string[];
  licences: string[];
  transports: string[];
  employmentForms: string[];
}

export const EMPTY_OFFER_FILTERS: OfferFiltersVm = {
  routeCountries: [],
  cadences: [],
  licences: [],
  transports: [],
  employmentForms: [],
};

export function hasOfferFilters(value: OfferFiltersVm): boolean {
  return (
    value.routeCountries.length > 0 ||
    value.cadences.length > 0 ||
    value.licences.length > 0 ||
    value.transports.length > 0 ||
    value.employmentForms.length > 0
  );
}

export function offerCountLabel(count: number): string {
  return pluralPl(count, 'oferta', 'oferty', 'ofert');
}

export function countriesChipLabel(codes: string[]): string {
  if (!codes.length) {
    return 'Kraje trasy';
  }
  if (codes.length === 1) {
    const name =
      COUNTRIES.find((c) => c.code === codes[0])?.namePl ?? codes[0];
    return `Kraje trasy: ${name}`;
  }
  return `Kraje trasy: ${codes.join(', ')}`;
}

export function cadenceChipLabel(
  cadences: string[],
  labels: Record<string, string>
): string {
  if (!cadences.length) {
    return 'Powrót do domu';
  }
  if (cadences.length === 1) {
    return `Powrót do domu: ${labels[cadences[0]] ?? cadences[0]}`;
  }
  return `Powrót do domu: ${cadences.length} wybrane`;
}

export function licenceChipLabel(licences: string[]): string {
  if (!licences.length) {
    return 'Prawo jazdy';
  }
  if (licences.length === 1) {
    const label =
      DRIVER_LICENSES.find((l) => l.code === licences[0])?.label ?? licences[0];
    return `Prawo jazdy: ${label}`;
  }
  return `Prawo jazdy: ${licences.length} wybrane`;
}

export function transportChipLabel(transports: string[]): string {
  if (!transports.length) {
    return 'Typ transportu';
  }
  if (transports.length === 1) {
    const name =
      TRANSPORT_TYPES.find((t) => t.code === transports[0])?.namePl ??
      transports[0];
    return `Typ transportu: ${name}`;
  }
  return `Typ transportu: ${transports.length} wybrane`;
}

export function employmentChipLabel(forms: string[]): string {
  if (!forms.length) {
    return 'Forma zatrudnienia';
  }
  if (forms.length === 1) {
    const name =
      EMPLOYMENT_FORMS.find((f) => f.code === forms[0])?.namePl ?? forms[0];
    return `Forma zatrudnienia: ${name}`;
  }
  return `Forma zatrudnienia: ${forms.length} wybrane`;
}

export const COUNTRY_CHIP_COLLAPSE_LIMIT = 5;

export function visibleCountryChips<T extends { code: string }>(
  countries: readonly T[],
  selectedCodes: readonly string[],
  expanded: boolean
): { visible: T[]; hiddenCount: number } {
  if (expanded || countries.length <= COUNTRY_CHIP_COLLAPSE_LIMIT) {
    return { visible: [...countries], hiddenCount: 0 };
  }

  const selected = new Set(selectedCodes);
  const picked = new Set<string>();
  for (const country of countries) {
    if (selected.has(country.code)) {
      picked.add(country.code);
    }
  }
  for (const country of countries) {
    if (picked.size >= COUNTRY_CHIP_COLLAPSE_LIMIT) {
      break;
    }
    picked.add(country.code);
  }

  const visible = countries.filter((country) => picked.has(country.code));
  return {
    visible,
    hiddenCount: countries.length - visible.length,
  };
}
