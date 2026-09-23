import { isValidApplicationPhone } from '@baza/shared-types';
import {
  Validators,
  type AbstractControl,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';

/**
 * E-mail check on the trimmed value: phone keyboards often append a space after
 * an autocompleted address, which plain `Validators.email` rejects.
 */
export function trimmedEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Validators.email({
      value: typeof value === 'string' ? value.trim() : value,
    } as AbstractControl);
  };
}

/** Same phone rule as the API DTO; empty is left to `Validators.required`. */
export function applicationPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || String(value).trim() === '') {
      return null;
    }
    return isValidApplicationPhone(String(value)) ? null : { phoneFormat: true };
  };
}
