import { toOfferCardVm } from './offer-card.vm';
import type { JobOffer } from '@baza/shared-types';

const OFFER: JobOffer = {
  id: 'o1',
  companyId: 'c1',
  title: 'Kierowca C+E — trasy PL–IT',
  description: '',
  homeReturnCadence: 'biweekly',
  requiredYearsExperience: 2,
  requiredTransportType: 'curtain',
  licenseCategory: 'C_E',
  employmentForms: ['uop', 'b2b'],
  routes: [
    { from: { code: 'PL', name: 'Polska' }, to: { code: 'IT', name: 'Włochy' } },
    { from: { code: 'IT', name: 'Włochy' }, to: { code: 'PL', name: 'Polska' } },
    { from: { code: 'PL', name: 'Polska' }, to: { code: 'DE', name: 'Niemcy' } },
  ],
  salary: { min: 8000, max: 10000, currency: 'PLN' },
  published: true,
  publishedAt: '2026-09-11T00:00:00.000Z',
  baseLocation: null,
  companyBaseLocationText: 'Poznań, Wielkopolskie',
  companyName: 'Transgór Logistics',
  companyPhotoUrls: null,
};

describe('toOfferCardVm', () => {
  it('maps hierarchy fields and caps extra routes as +N', () => {
    const vm = toOfferCardVm(OFFER, 'logo.png');
    expect(vm.title).toBe('Kierowca C+E — trasy PL–IT');
    expect(vm.companyName).toBe('Transgór Logistics');
    expect(vm.companyLogoUrl).toBe('logo.png');
    expect(vm.baseCity).toBe('Poznań, Wielkopolskie');
    expect(vm.routes).toEqual(['PL → IT', 'IT → PL', '+1']);
    expect(vm.cadence).toBe('Co dwa tygodnie');
    expect(vm.licence).toBe('C+E');
    expect(vm.transport).toBe('Plandeka / firanka');
    expect(vm.employment).toBe('Umowa o pracę, B2B');
    expect(vm.experience).toBe('min. 2 lata');
    expect(vm.salary).toContain('PLN');
    expect(vm.salary).toMatch(/8[\u00a0 ]?000/);
  });

  it('uses singular year label', () => {
    const vm = toOfferCardVm({ ...OFFER, requiredYearsExperience: 1 });
    expect(vm.experience).toBe('min. 1 rok');
  });
});
