/** Required driving-license category on a job offer (wire/DB codes). */
export type DriverLicenseCategory = 'B' | 'C' | 'CE' | 'C_E';

export interface DriverLicenseOption {
  code: DriverLicenseCategory;
  /** UI label; `C_E` displays as `C+E`. */
  label: string;
}

export const DRIVER_LICENSES: readonly DriverLicenseOption[] = [
  { code: 'B', label: 'B' },
  { code: 'C', label: 'C' },
  { code: 'CE', label: 'CE' },
  { code: 'C_E', label: 'C+E' },
] as const;

export const DRIVER_LICENSE_CODES: readonly DriverLicenseCategory[] =
  DRIVER_LICENSES.map((l) => l.code);

export function isDriverLicenseCategory(
  value: string
): value is DriverLicenseCategory {
  return (DRIVER_LICENSE_CODES as readonly string[]).includes(value);
}

export function driverLicenseLabel(code: DriverLicenseCategory): string {
  return DRIVER_LICENSES.find((l) => l.code === code)?.label ?? code;
}
