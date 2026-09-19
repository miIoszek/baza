import {
  driverLicenseLabel,
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
    cadence: CADENCE_LABELS[offer.homeReturnCadence] ?? offer.homeReturnCadence,
    licence: driverLicenseLabel(offer.licenseCategory),
    transport:
      TRANSPORT_TYPES.find((t) => t.code === offer.requiredTransportType)
        ?.namePl ?? offer.requiredTransportType,
    experience: experienceLabel(offer.requiredYearsExperience),
    salary: formatSalary(offer),
  };
}

function experienceLabel(years: number): string {
  const n = Math.abs(years);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) {
    return 'min. 1 rok';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `min. ${years} lata`;
  }
  return `min. ${years} lat`;
}

function formatSalary(offer: JobOffer): string | null {
  const s = offer.salary;
  if (!s) {
    return null;
  }
  const fmt = (n: number) => n.toLocaleString('pl-PL');
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
