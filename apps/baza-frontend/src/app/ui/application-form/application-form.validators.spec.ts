import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { isValidApplicationPhone } from '@baza/shared-types';
import { applicationPhoneValidator } from './application-form.validators';

describe('application phone', () => {
  it('rejects letters and short numbers', () => {
    expect(isValidApplicationPhone('abcdefghi')).toBe(false);
    expect(isValidApplicationPhone('12345')).toBe(false);
    expect(applicationPhoneValidator()(new FormControl('qweqweqwe'))).toEqual({
      phoneFormat: true,
    });
  });

  it('accepts PL-style numbers', () => {
    expect(isValidApplicationPhone('123456789')).toBe(true);
    expect(isValidApplicationPhone('+48 123 456 789')).toBe(true);
    expect(applicationPhoneValidator()(new FormControl('+48123456789'))).toBe(null);
  });

  it('rejects numbers longer than the field max', () => {
    expect(isValidApplicationPhone('+48 123 456 789 012')).toBe(false);
  });

  it('leaves an empty value to the required validator', () => {
    expect(applicationPhoneValidator()(new FormControl(''))).toBeNull();
  });
});
