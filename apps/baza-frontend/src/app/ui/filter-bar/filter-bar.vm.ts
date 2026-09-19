import {
  COUNTRIES,
  DRIVER_LICENSES,
  TRANSPORT_TYPES,
} from '@baza/shared-types';

export interface OfferFiltersVm {
  routeCountries: string[];
  cadence: string | null;
  licence: string | null;
  transport: string | null;
}

export const EMPTY_OFFER_FILTERS: OfferFiltersVm = {
  routeCountries: [],
  cadence: null,
  licence: null,
  transport: null,
};

export function hasOfferFilters(value: OfferFiltersVm): boolean {
  return (
    value.routeCountries.length > 0 ||
    !!value.cadence ||
    !!value.licence ||
    !!value.transport
  );
}

export function offerCountLabel(count: number): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) {
    return '1 oferta';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} oferty`;
  }
  return `${count} ofert`;
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
  cadence: string | null,
  labels: Record<string, string>
): string {
  if (!cadence) {
    return 'Powrót do domu';
  }
  return `Powrót do domu: ${labels[cadence] ?? cadence}`;
}

export function licenceChipLabel(licence: string | null): string {
  if (!licence) {
    return 'Prawo jazdy';
  }
  const label =
    DRIVER_LICENSES.find((l) => l.code === licence)?.label ?? licence;
  return `Prawo jazdy: ${label}`;
}

export function transportChipLabel(transport: string | null): string {
  if (!transport) {
    return 'Typ transportu';
  }
  const name =
    TRANSPORT_TYPES.find((t) => t.code === transport)?.namePl ?? transport;
  return `Typ transportu: ${name}`;
}
