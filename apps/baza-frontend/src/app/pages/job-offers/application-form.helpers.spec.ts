import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { isValidApplicationPhone } from '@baza/shared-types';
import {
  applicationPhoneValidator,
  buildApplicationFormData,
  hasPublishableBaseCoords,
  validateApplicationCv,
} from './application-form.helpers';

describe('validateApplicationCv', () => {
  it('requires a file', () => {
    expect(validateApplicationCv(null)).toMatch(/CV/);
  });

  it('rejects non-PDF', () => {
    const file = new File(['x'], 'cv.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(validateApplicationCv(file)).toMatch(/PDF/);
  });

  it('rejects oversized PDF', () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'cv.pdf', {
      type: 'application/pdf',
    });
    expect(validateApplicationCv(big)).toMatch(/5 MB/);
  });

  it('accepts PDF ≤5 MB', () => {
    const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
    expect(validateApplicationCv(file)).toBeNull();
  });
});

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
    expect(applicationPhoneValidator()(new FormControl('+48123456789'))).toBe(
      null
    );
  });

  it('rejects numbers longer than the field max', () => {
    expect(isValidApplicationPhone('+48 123 456 789 012')).toBe(false);
  });
});

describe('hasPublishableBaseCoords', () => {
  it('is false without company or coords', () => {
    expect(hasPublishableBaseCoords(null)).toBe(false);
    expect(
      hasPublishableBaseCoords({ baseLat: null, baseLng: 19 })
    ).toBe(false);
  });

  it('is true when both coords are finite', () => {
    expect(
      hasPublishableBaseCoords({ baseLat: 52.2, baseLng: 21.0 })
    ).toBe(true);
  });
});

describe('buildApplicationFormData', () => {
  it('omits empty message and sends consent true', () => {
    const cv = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
    const fd = buildApplicationFormData({
      email: ' a@b.pl ',
      phone: ' +48111 ',
      message: '  ',
      consentAccepted: true,
      cv,
    });
    expect(fd.get('email')).toBe('a@b.pl');
    expect(fd.get('phone')).toBe('+48111');
    expect(fd.get('message')).toBeNull();
    expect(fd.get('consentAccepted')).toBe('true');
    expect(fd.get('cv')).toBeInstanceOf(File);
  });
});
