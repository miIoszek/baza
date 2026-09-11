import {
  APPLICATION_CV_MAX_BYTES,
  APPLICATION_FIELD_LIMITS,
  isValidApplicationPhone,
} from '@baza/shared-types';
import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export function validateApplicationCv(file: File | null): string | null {
  if (!file) {
    return 'Dołącz CV w formacie PDF';
  }
  if (file.type !== 'application/pdf') {
    return 'CV musi być plikiem PDF';
  }
  if (file.size > APPLICATION_CV_MAX_BYTES) {
    return 'CV może mieć max. 5 MB';
  }
  return null;
}

export function applicationPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || String(value).trim() === '') {
      return null;
    }
    return isValidApplicationPhone(String(value))
      ? null
      : { phoneFormat: true };
  };
}

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
  message: string;
  consentAccepted: boolean;
  cv: File;
}): FormData {
  const fd = new FormData();
  fd.append('email', input.email.trim());
  fd.append('phone', input.phone.trim());
  const message = input.message.trim();
  if (message) {
    fd.append('message', message.slice(0, APPLICATION_FIELD_LIMITS.message));
  }
  fd.append('consentAccepted', input.consentAccepted ? 'true' : 'false');
  fd.append('cv', input.cv, input.cv.name);
  return fd;
}
