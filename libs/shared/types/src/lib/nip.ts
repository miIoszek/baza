const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7] as const;

/**
 * Polish tax id (NIP): 10 digits whose weighted sum of the first nine, mod 11,
 * equals the last digit. Catches most typos before the form is sent.
 */
export function isValidNip(value: string): boolean {
  if (!/^\d{10}$/.test(value)) {
    return false;
  }
  const digits = [...value].map(Number);
  const sum = NIP_WEIGHTS.reduce((acc, weight, i) => acc + weight * digits[i], 0);
  const check = sum % 11;
  return check !== 10 && check === digits[9];
}
