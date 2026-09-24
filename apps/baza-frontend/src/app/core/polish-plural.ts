/**
 * Count with the Polish noun form it takes: `pluralPl(n, 'oferta', 'oferty', 'ofert')`
 * gives "1 oferta", "3 oferty", "5 ofert", "12 ofert", "22 oferty".
 */
export function pluralPl(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  const noun =
    n === 1 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${count} ${noun}`;
}
