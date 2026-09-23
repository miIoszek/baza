import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Coordinates the way people paste them: "52.4300, 16.9500" (copied from Google Maps),
 * "52.43 16.95", "52,43; 16,95". Null unless it is two numbers within lat/lng range.
 */
export function parseCoordinates(text: string | null | undefined): LatLng | null {
  const match = (text ?? '')
    .trim()
    .match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) {
    return null;
  }
  const lat = Number(match[1].replace(',', '.'));
  const lng = Number(match[2].replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat, lng };
}

/** "52.4300, 16.9500" — four decimals, about 10 m. */
export function formatCoordinates({ lat, lng }: LatLng): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Empty is fine (no pin yet); anything else must parse. */
export function coordinatesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim();
    return !text || parseCoordinates(text) ? null : { coordinates: true };
  };
}
