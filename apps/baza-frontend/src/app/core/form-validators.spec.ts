import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { isValidNip } from '@baza/shared-types';
import {
  matchesControlValidator,
  nipValidator,
  passwordPolicyValidator,
  trimmedEmailValidator,
} from './form-validators';

describe('trimmedEmailValidator', () => {
  it('accepts an address with a trailing space from a phone keyboard', () => {
    expect(trimmedEmailValidator()(new FormControl(' jan@example.com '))).toBeNull();
  });

  it('still rejects a malformed address', () => {
    expect(trimmedEmailValidator()(new FormControl('jan@'))).toEqual({ email: true });
  });
});

describe('nip', () => {
  it('accepts a NIP with a valid checksum', () => {
    expect(isValidNip('1234563218')).toBe(true);
    expect(nipValidator()(new FormControl('123-456-32-18'))).toBeNull();
  });

  it('rejects a typo, wrong length and letters', () => {
    expect(isValidNip('1234563219')).toBe(false);
    expect(isValidNip('123456321')).toBe(false);
    expect(nipValidator()(new FormControl('12345abc18'))).toEqual({ nip: true });
  });
});

describe('passwordPolicyValidator', () => {
  // Validators run once before the control joins its group; re-run like the page does.
  const group = (email: string, password: string) => {
    const form = new FormGroup({
      email: new FormControl(email),
      password: new FormControl(password, passwordPolicyValidator('email')),
    });
    form.controls.password.updateValueAndValidity();
    return form;
  };

  it('matches the API policy: length, variety, not the e-mail', () => {
    expect(group('jan@firma.pl', 'mocne-haslo-2026').controls.password.errors).toBeNull();
    expect(group('jan@firma.pl', 'krotkie').controls.password.errors).toEqual({
      passwordPolicy: true,
    });
    expect(group('jan@firma.pl', 'aaaaaaaaaaaa').controls.password.errors).toEqual({
      passwordPolicy: true,
    });
    expect(group('jan.kowalski@firma.pl', 'jan.kowalski').controls.password.errors).toEqual({
      passwordPolicy: true,
    });
  });
});

describe('matchesControlValidator', () => {
  it('flags a different confirmation', () => {
    const form = new FormGroup({
      password: new FormControl('mocne-haslo-2026'),
      confirm: new FormControl('mocne-haslo-2025', matchesControlValidator('password')),
    });
    form.controls.confirm.updateValueAndValidity();
    expect(form.controls.confirm.errors).toEqual({ mismatch: true });
    form.controls.confirm.setValue('mocne-haslo-2026');
    expect(form.controls.confirm.errors).toBeNull();
  });
});
