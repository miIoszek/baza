import { APPLICATION_FIELD_LIMITS } from '@baza/shared-types';

export function hasPublishableBaseCoords(company: {
  baseLat: number | null;
  baseLng: number | null;
} | null): boolean {
  if (!company) {
    return false;
  }
  return (
    company.baseLat != null &&
    company.baseLng != null &&
    Number.isFinite(company.baseLat) &&
    Number.isFinite(company.baseLng)
  );
}

export function buildApplicationFormData(input: {
  email: string;
  phone: string;
  message?: string;
  consentAccepted: boolean;
  cv: File;
}): FormData {
  const fd = new FormData();
  fd.append('email', input.email.trim());
  fd.append('phone', input.phone.trim());
  const message = input.message?.trim() ?? '';
  if (message) {
    fd.append('message', message.slice(0, APPLICATION_FIELD_LIMITS.message));
  }
  fd.append('consentAccepted', input.consentAccepted ? 'true' : 'false');
  fd.append('cv', input.cv, input.cv.name);
  return fd;
}
