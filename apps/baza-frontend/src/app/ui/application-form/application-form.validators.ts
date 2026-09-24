import { isValidApplicationPhone } from '@baza/shared-types';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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
