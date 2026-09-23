import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { coordinatesValidator, formatCoordinates, parseCoordinates } from './coordinates';

describe('parseCoordinates', () => {
  it('reads what Google Maps copies and other common spellings', () => {
    const poznan = { lat: 52.43, lng: 16.95 };
    expect(parseCoordinates('52.43, 16.95')).toEqual(poznan);
    expect(parseCoordinates(' 52.430000,16.950000 ')).toEqual(poznan);
    expect(parseCoordinates('52.43 16.95')).toEqual(poznan);
    expect(parseCoordinates('52,43; 16,95')).toEqual(poznan);
    expect(parseCoordinates('52,43, 16,95')).toEqual(poznan);
    expect(parseCoordinates('-33.9, 151.2')).toEqual({ lat: -33.9, lng: 151.2 });
  });

  it('rejects text that is not two numbers in range', () => {
    expect(parseCoordinates('')).toBeNull();
    expect(parseCoordinates('Poznań')).toBeNull();
    expect(parseCoordinates('52.43')).toBeNull();
    expect(parseCoordinates('91, 16')).toBeNull();
    expect(parseCoordinates('52, 181')).toBeNull();
    expect(parseCoordinates('52.43, 16.95, 3')).toBeNull();
  });
});

describe('formatCoordinates', () => {
  it('shows four decimals', () => {
    expect(formatCoordinates({ lat: 52.43, lng: 16.9066123 })).toBe('52.4300, 16.9066');
  });
});

describe('coordinatesValidator', () => {
  it('allows empty text and flags text that does not parse', () => {
    const control = new FormControl('', { validators: coordinatesValidator() });
    expect(control.valid).toBe(true);
    control.setValue('52.43, 16.95');
    expect(control.valid).toBe(true);
    control.setValue('52.43');
    expect(control.hasError('coordinates')).toBe(true);
  });
});
