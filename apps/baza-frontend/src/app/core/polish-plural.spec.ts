import { describe, expect, it } from 'vitest';
import { pluralPl } from './polish-plural';

describe('pluralPl', () => {
  const offers = (n: number) => pluralPl(n, 'oferta', 'oferty', 'ofert');

  it('picks the Polish form for the count', () => {
    expect([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 102, 112, 122].map(offers)).toEqual([
      '0 ofert',
      '1 oferta',
      '2 oferty',
      '4 oferty',
      '5 ofert',
      '11 ofert',
      '12 ofert',
      '14 ofert',
      '21 ofert',
      '22 oferty',
      '25 ofert',
      '102 oferty',
      '112 ofert',
      '122 oferty',
    ]);
  });

  it('works for other nouns', () => {
    expect(pluralPl(3, 'aplikacja', 'aplikacje', 'aplikacji')).toBe('3 aplikacje');
    expect(pluralPl(1, 'rok', 'lata', 'lat')).toBe('1 rok');
  });
});
