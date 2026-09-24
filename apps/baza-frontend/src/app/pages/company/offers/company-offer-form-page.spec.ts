import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobOffer } from '@baza/shared-types';
import { AuthService } from '../../../core/auth.service';
import { routeGroup } from '../../../ui';
import { CompanyOfferFormPage } from './company-offer-form-page';

const CENTROIDS = [
  { code: 'PL', namePl: 'Polska', lat: 52, lng: 19 },
  { code: 'DE', namePl: 'Niemcy', lat: 51, lng: 10 },
  { code: 'IT', namePl: 'Włochy', lat: 42, lng: 12 },
  { code: 'FR', namePl: 'Francja', lat: 46, lng: 2 },
];

const OFFER: JobOffer = {
  id: 'o1',
  companyId: 'c1',
  title: 'Kierowca C+E — trasy PL–IT',
  routes: [
    { from: { code: 'PL', name: 'Polska' }, to: { code: 'IT', name: 'Włochy' } },
    { from: { code: 'IT', name: 'Włochy' }, to: { code: 'PL', name: 'Polska' } },
  ],
  homeReturnCadence: 'biweekly',
  requiredYearsExperience: 2,
  requiredTransportType: 'curtain',
  licenseCategory: 'C_E',
  employmentForms: ['uop', 'b2b'],
  description: 'Stałe trasy do Włoch.',
  salary: { min: 8000, max: 10000, currency: 'PLN' },
  baseLocation: null,
  companyBaseLocationText: null,
  companyName: 'Transgór',
  companyPhotoUrls: null,
  published: true,
  publishedAt: '2026-09-20T08:00:00.000Z',
} as JobOffer;

describe('CompanyOfferFormPage', () => {
  let auth: { whenReady: Mock; refreshMe: Mock; company: Mock };
  let routeId: string | null;

  beforeEach(async () => {
    routeId = null;
    auth = {
      whenReady: vi.fn().mockResolvedValue(undefined),
      refreshMe: vi.fn().mockResolvedValue(undefined),
      company: vi.fn().mockReturnValue({ id: 'c1', baseLat: 52.2, baseLng: 21.0 }),
    };

    await TestBed.configureTestingModule({
      imports: [CompanyOfferFormPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
      ],
    }).compileComponents();
  });

  /** Renders the page (which runs ngOnInit) and answers its start-up requests. */
  async function start(offers: JobOffer[] | 'fail' = [OFFER]) {
    const fixture = TestBed.createComponent(CompanyOfferFormPage);
    const page = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    http.expectOne((r) => r.url.endsWith('/api/geo/countries')).flush(CENTROIDS);
    if (routeId) {
      const req = http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/company/offers'));
      if (offers === 'fail') {
        req.flush({ message: 'boom' }, { status: 500, statusText: 'Error' });
      } else {
        req.flush(offers);
      }
    }
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, page, http };
  }

  function fillValid(page: CompanyOfferFormPage): void {
    page['form'].patchValue({ title: '  Kierowca C — chłodnia ', description: 'Opis' });
    page['routes'].at(0).patchValue({ toCountry: 'DE' });
  }

  it('requires license category', async () => {
    const { page } = await start();

    page['form'].controls.licenseCategory.setValue('' as never);
    expect(page['form'].controls.licenseCategory.hasError('required')).toBe(true);
  });

  it('requires at least one employment form and keeps the dictionary order', async () => {
    const { page } = await start();

    page['toggleEmploymentForm']('zlecenie', true);
    page['toggleEmploymentForm']('b2b', true);
    expect(page['form'].controls.employmentForms.value).toEqual(['uop', 'b2b', 'zlecenie']);

    page['form'].controls.employmentForms.setValue([]);
    expect(page['form'].controls.employmentForms.hasError('required')).toBe(true);
  });

  it('accepts whole years of experience from 0 to 40 only', async () => {
    const { page } = await start();
    const years = page['form'].controls.requiredYearsExperience;

    years.setValue(-1);
    expect(years.hasError('min')).toBe(true);
    years.setValue(41);
    expect(years.hasError('max')).toBe(true);
    years.setValue(2.5);
    expect(years.hasError('pattern')).toBe(true);
    years.setValue(40);
    expect(years.valid).toBe(true);
  });

  it('rejects salary min greater than max', async () => {
    const { page } = await start();

    page['form'].patchValue({ salaryMin: 7000, salaryMax: 5000, salaryCurrency: 'PLN' });
    expect(page['form'].hasError('salaryRange')).toBe(true);
  });

  it('requires 3-letter currency when salary amount is set', async () => {
    const { page } = await start();

    page['form'].patchValue({ salaryMin: 5000, salaryCurrency: 'PL' });
    expect(page['form'].hasError('salaryCurrencyRequired')).toBe(true);
  });

  it('starts a new offer with one route from Poland and is invalid without routes', async () => {
    const { page } = await start();

    expect(page['routes'].getRawValue()).toEqual([{ fromCountry: 'PL', toCountry: '' }]);
    page['routes'].clear();
    expect(page['routes'].hasError('required')).toBe(true);
    expect(page['form'].invalid).toBe(true);
    expect(page['routeCountLabel']()).toBe('0 tras');
  });

  it('keeps the route count and the preview in step with the rows', async () => {
    const { page } = await start();

    page['routes'].push(routeGroup('DE', 'IT'));
    expect(page['routeCountLabel']()).toBe('2 trasy');
    expect(page['routeRows']()).toEqual([
      { fromCountry: 'PL', toCountry: '' },
      { fromCountry: 'DE', toCountry: 'IT' },
    ]);
    expect(page['centroids']()).toEqual(CENTROIDS);
  });

  it('posts the offer with country names and a trimmed title', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { page, http } = await start();
    fillValid(page);
    page['form'].patchValue({ salaryMin: 7000, salaryCurrency: 'eur' });

    const pending = page['onSubmit']();
    const req = http.expectOne(
      (r) => r.method === 'POST' && r.url.endsWith('/api/company/offers')
    );
    expect(req.request.body).toEqual({
      title: 'Kierowca C — chłodnia',
      description: 'Opis',
      homeReturnCadence: 'weekly',
      requiredYearsExperience: 0,
      requiredTransportType: 'curtain',
      licenseCategory: 'C',
      employmentForms: ['uop'],
      routes: [{ from: { code: 'PL', name: 'Polska' }, to: { code: 'DE', name: 'Niemcy' } }],
      salaryMin: 7000,
      salaryMax: null,
      salaryCurrency: 'EUR',
      published: true,
    });
    req.flush({ ...OFFER, id: 'new' });
    await pending;
    expect(navigate).toHaveBeenCalledWith('/company/offers');
  });

  it('does not send anything while the form is invalid', async () => {
    const { page, http } = await start();

    await page['onSubmit']();
    http.expectNone((r) => r.method === 'POST');
    expect(page['form'].controls.title.touched).toBe(true);
  });

  it('saves a draft when the company has no base address', async () => {
    auth.company.mockReturnValue({ id: 'c1', baseLat: null, baseLng: null });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { page, http } = await start();

    expect(page['canPublish']()).toBe(false);
    expect(page['form'].controls.published.value).toBe(false);
    page['setPublished'](true);
    expect(page['form'].controls.published.value).toBe(false);

    fillValid(page);
    const pending = page['onSubmit']();
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.published).toBe(false);
    req.flush({ ...OFFER, published: false });
    await pending;
  });

  it('fills the form from the offer being edited', async () => {
    routeId = 'o1';
    const { page } = await start([OFFER]);

    expect(page['editId']()).toBe('o1');
    expect(page['routes'].getRawValue()).toEqual([
      { fromCountry: 'PL', toCountry: 'IT' },
      { fromCountry: 'IT', toCountry: 'PL' },
    ]);
    expect(page['form'].getRawValue()).toMatchObject({
      title: OFFER.title,
      homeReturnCadence: 'biweekly',
      licenseCategory: 'C_E',
      employmentForms: ['uop', 'b2b'],
      salaryMin: 8000,
      salaryMax: 10000,
      published: true,
    });
  });

  it('shows an error instead of a form with defaults when the offer does not load', async () => {
    routeId = 'o1';
    const { fixture, page } = await start('fail');

    const el = fixture.nativeElement as HTMLElement;
    expect(page['loadFailed']()).toBe(true);
    expect(el.textContent).toContain('Nie udało się wczytać oferty');
    expect(el.querySelector('form')).toBeNull();
  });
});
