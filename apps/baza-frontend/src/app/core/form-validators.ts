import {
  Validators,
  type AbstractControl,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';
import { isAcceptablePassword, isValidNip } from '@baza/shared-types';

/**
 * E-mail check on the trimmed value: phone keyboards often append a space after an autocompleted
 * address, which plain `Validators.email` rejects. Trim again before sending.
 */
export function trimmedEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Validators.email({
      value: typeof value === 'string' ? value.trim() : value,
    } as AbstractControl);
  };
}

/**
 * The API's password policy (@baza/shared-types). Reads the sibling e-mail control, so re-run it
 * when the e-mail changes (`updateValueAndValidity`).
 */
export function passwordPolicyValidator(emailControlName?: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return null;
    }
    const email = emailControlName
      ? (control.parent?.get(emailControlName)?.value as string | undefined)
      : null;
    return isAcceptablePassword(value, email) ? null : { passwordPolicy: true };
  };
}

/** Same value as the sibling control (password confirmation). */
export function matchesControlValidator(otherControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const other = control.parent?.get(otherControlName)?.value;
    if (!control.value || !other) {
      return null;
    }
    return control.value === other ? null : { mismatch: true };
  };
}

/** 10 digits with a valid NIP checksum; spaces and dashes typed by people are ignored. */
export function nipValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').replace(/[\s-]/g, '');
    if (!value) {
      return null;
    }
    return isValidNip(value) ? null : { nip: true };
  };
}
