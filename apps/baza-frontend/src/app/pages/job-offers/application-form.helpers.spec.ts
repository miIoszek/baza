import { describe, expect, it } from 'vitest';
import {
  buildApplicationFormData,
  hasPublishableBaseCoords,
} from './application-form.helpers';

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
