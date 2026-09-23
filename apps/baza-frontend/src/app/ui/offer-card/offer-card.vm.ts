import {
  driverLicenseLabel,
  employmentFormsLabel,
  TRANSPORT_TYPES,
  type JobOffer,
} from '@baza/shared-types';

export interface OfferCardVm {
  id: string;
  title: string;
  companyName: string;
  companyId: string;
  companyLogoUrl?: string | null;
  baseCity: string;
  routes: string[];
  cadence: string;
  licence: string;
  transport: string;
  employment: string;
  experience: string;
  salary?: string | null;
}

const CADENCE_LABELS: Record<string, string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  biweekly: 'Co dwa tygodnie',
  monthly: 'Co miesiąc',
  flexible: 'Elastycznie',
};

const MAX_VISIBLE_ROUTES = 2;

export function toOfferCardVm(
  offer: JobOffer,
  logoUrl: string | null = null
): OfferCardVm {
  const routeLabels = offer.routes.map(
    (r) => `${r.from.code} → ${r.to.code}`
  );
  const extra = routeLabels.length - MAX_VISIBLE_ROUTES;
  const routes =
    extra > 0
      ? [...routeLabels.slice(0, MAX_VISIBLE_ROUTES), `+${extra}`]
      : routeLabels;

  return {
    id: offer.id,
    title: offer.title,
    companyName: offer.companyName || 'Firma',
    companyId: offer.companyId,
    companyLogoUrl: logoUrl,
    baseCity: offer.companyBaseLocationText ?? '',
    routes,
    cadence: cadenceLabel(offer.homeReturnCadence),
    licence: driverLicenseLabel(offer.licenseCategory),
    transport: transportLabel(offer.requiredTransportType),
    employment: employmentFormsLabel(offer.employmentForms),
    experience: `min. ${yearsLabel(offer.requiredYearsExperience)}`,
    salary: formatSalary(offer),
  };
}

export function cadenceLabel(code: string): string {
  return CADENCE_LABELS[code] ?? code;
}

export function transportLabel(code: string): string {
  return TRANSPORT_TYPES.find((t) => t.code === code)?.namePl ?? code;
}

/** "1 rok", "2 lata", "5 lat", "12 lat", "22 lata". */
export function yearsLabel(years: number): string {
  const n = Math.abs(years);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) {
    return '1 rok';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${years} lata`;
  }
  return `${years} lat`;
}

/** "8 000–10 000 PLN", "od 6 000 PLN"; null when no amount is given. */
export function formatSalary(offer: JobOffer): string | null {
  const s = offer.salary;
  if (!s) {
    return null;
  }
  // pl-PL leaves 4-digit amounts ungrouped ("8000–10 000"); group every thousand
  // with a no-break space so both ends read alike and never wrap mid-number.
  const fmt = (n: number) =>
    String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (s.min != null && s.max != null) {
    return `${fmt(s.min)}–${fmt(s.max)} ${s.currency}`;
  }
  if (s.min != null) {
    return `od ${fmt(s.min)} ${s.currency}`;
  }
  if (s.max != null) {
    return `do ${fmt(s.max)} ${s.currency}`;
  }
  return null;
}
