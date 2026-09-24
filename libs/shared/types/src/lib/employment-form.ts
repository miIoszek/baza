/** Form of employment offered (company) or sought (driver). Wire/DB codes. */
export type EmploymentForm = 'uop' | 'b2b' | 'zlecenie';

export interface EmploymentFormOption {
  code: EmploymentForm;
  namePl: string;
}

export const EMPLOYMENT_FORMS: readonly EmploymentFormOption[] = [
  { code: 'uop', namePl: 'Umowa o pracę' },
  { code: 'b2b', namePl: 'B2B' },
  { code: 'zlecenie', namePl: 'Umowa zlecenie' },
] as const;

export const EMPLOYMENT_FORM_CODES: readonly EmploymentForm[] =
  EMPLOYMENT_FORMS.map((f) => f.code);

export function isEmploymentForm(value: string): value is EmploymentForm {
  return (EMPLOYMENT_FORM_CODES as readonly string[]).includes(value);
}

/** Stable unique order matching EMPLOYMENT_FORM_CODES. Drops unknown values. */
export function normalizeEmploymentForms(
  values: readonly string[]
): EmploymentForm[] {
  const set = new Set(values.filter(isEmploymentForm));
  return EMPLOYMENT_FORM_CODES.filter((code) => set.has(code));
}

export function employmentFormsOverlap(
  offerForms: readonly string[],
  filterForms: readonly string[]
): boolean {
  if (!filterForms.length) {
    return true;
  }
  const wanted = new Set(filterForms.filter(isEmploymentForm));
  if (!wanted.size) {
    return true;
  }
  return offerForms.some((code) => wanted.has(code as EmploymentForm));
}

export function employmentFormsLabel(forms: readonly string[]): string {
  const labels = normalizeEmploymentForms(forms).map(
    (code) => EMPLOYMENT_FORMS.find((f) => f.code === code)?.namePl ?? code
  );
  return labels.join(', ');
}
