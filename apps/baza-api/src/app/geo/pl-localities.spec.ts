import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../identity/decorators';
import { GeoController } from './geo.controller';
import { areaLabel, normalizeName, searchLocalities } from './pl-localities';

describe('normalizeName', () => {
  it('drops case, Polish letters and punctuation', () => {
    expect(normalizeName('Łódź')).toBe('lodz');
    expect(normalizeName('Bielsko-Biała')).toBe('bielsko biala');
    expect(normalizeName('  Nowa Wieś,  Wschowa ')).toBe('nowa wies wschowa');
  });
});

describe('areaLabel', () => {
  it('leaves out a gmina or powiat named like the place', () => {
    expect(areaLabel('Warszawa', ['Warszawa', 'Warszawa', 'mazowieckie'])).toBe('woj. mazowieckie');
    expect(areaLabel('Kórnik', ['Kórnik', 'poznański', 'wielkopolskie'])).toBe(
      'pow. poznański, woj. wielkopolskie'
    );
    expect(areaLabel('Nowa Wieś', ['Wschowa', 'wschowski', 'lubuskie'])).toBe(
      'gm. Wschowa, pow. wschowski, woj. lubuskie'
    );
  });
});

describe('searchLocalities', () => {
  it('finds places by the start of the name, with or without Polish letters', () => {
    const [first] = searchLocalities('lodz');
    expect(first).toMatchObject({ name: 'Łódź', kind: 'miasto', area: 'woj. łódzkie' });
    expect(first.lat).toBeCloseTo(51.77, 1);
    expect(first.lng).toBeCloseTo(19.46, 1);
    expect(searchLocalities('Kórn').map((p) => p.name)).toContain('Kórnik');
  });

  it('puts big cities first, then towns, then villages', () => {
    expect(searchLocalities('war')[0].name).toBe('Warszawa');
    expect(searchLocalities('bielsko')[0].name).toBe('Bielsko-Biała');
    // Among villages an exact name still comes before a longer one
    expect(searchLocalities('poznan').map((p) => p.kind + ' ' + p.name).slice(0, 2)).toEqual([
      'miasto Poznań',
      'wieś Poznań',
    ]);
    const poznan = searchLocalities('Poznań');
    expect(poznan[0]).toMatchObject({ name: 'Poznań', kind: 'miasto' });
    expect(poznan.slice(1).every((p) => p.kind !== 'miasto')).toBe(true);
  });

  it('narrows common names by gmina, powiat or voivodeship', () => {
    const hits = searchLocalities('Nowa Wieś Wschowa');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((p) => p.name.startsWith('Nowa Wieś') && p.area.includes('wschow'))).toBe(true);
  });

  it('returns at most 8 suggestions and nothing for too short or unknown text', () => {
    expect(searchLocalities('Nowa')).toHaveLength(8);
    expect(searchLocalities('a')).toEqual([]);
    expect(searchLocalities('  ')).toEqual([]);
    expect(searchLocalities('Qqqqq')).toEqual([]);
  });
});

describe('GeoController', () => {
  const reflector = new Reflector();
  const isPublic = (method: keyof GeoController) =>
    reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      GeoController.prototype[method],
      GeoController,
    ]) === true;

  it('keeps countries public and localities for signed-in companies only', () => {
    expect(isPublic('listCountries')).toBe(true);
    expect(isPublic('searchLocalities')).toBe(false);
  });
});
