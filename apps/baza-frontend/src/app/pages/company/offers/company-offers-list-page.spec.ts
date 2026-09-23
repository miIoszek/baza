import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, expect, it, vi } from 'vitest';
import type { JobOffer } from '@baza/shared-types';
import { CompanyOffersListPage, offersLabel } from './company-offers-list-page';

describe('CompanyOffersListPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyOffersListPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('sets error signal when GET /api/company/offers fails', async () => {
    const fixture = TestBed.createComponent(CompanyOffersListPage);
    const http = TestBed.inject(HttpTestingController);
    const snackBar = TestBed.inject(MatSnackBar);
    const openSpy = vi.spyOn(snackBar, 'open');
    const page = fixture.componentInstance;

    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.includes('/api/company/offers'));
    expect(req.request.method).toBe('GET');
    req.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['error']()).toBe('Unauthorized');
    expect(page['loading']()).toBe(false);
    expect(page['offers']()).toEqual([]);
    expect(openSpy).not.toHaveBeenCalled();
    http.verify();
  });

  it('loads offers on success and clears error', async () => {
    const fixture = TestBed.createComponent(CompanyOffersListPage);
    const http = TestBed.inject(HttpTestingController);
    const page = fixture.componentInstance;

    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.includes('/api/company/offers'));
    req.flush([
      {
        id: 'o1',
        companyId: 'c1',
        title: 'Trasa PL-DE',
        routes: [{ from: { code: 'PL', namePl: 'Polska' }, to: { code: 'DE', namePl: 'Niemcy' } }],
        homeReturnCadence: 'weekly',
        requiredYearsExperience: 2,
        requiredTransportType: 'ftl',
        licenseCategory: 'C',
        employmentForms: ['uop'],
        description: '',
        baseLocation: null,
        companyBaseLocationText: null,
        companyName: 'Acme',
        companyPhotoUrls: null,
        published: true,
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['error']()).toBeNull();
    expect(page['offers']().length).toBe(1);
    expect(page['offers']()[0].title).toBe('Trasa PL-DE');
    http.verify();
  });

  it('sets Polish fallback when GET fails with status 0 (network blocked)', async () => {
    const fixture = TestBed.createComponent(CompanyOffersListPage);
    const http = TestBed.inject(HttpTestingController);
    const page = fixture.componentInstance;

    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.includes('/api/company/offers'));
    req.error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(page['error']()).toBe('Nie udało się pobrać ofert');
    expect(page['loading']()).toBe(false);
    http.verify();
  });

  const offer = (over: Partial<JobOffer>): JobOffer => ({
    id: 'o1',
    companyId: 'c1',
    title: 'Kierowca C+E — trasy PL–IT',
    routes: [],
    homeReturnCadence: 'weekly',
    requiredYearsExperience: 2,
    requiredTransportType: 'curtain',
    licenseCategory: 'C_E',
    employmentForms: ['uop'],
    description: '',
    baseLocation: null,
    companyBaseLocationText: null,
    companyName: 'Acme',
    companyPhotoUrls: null,
    published: true,
    publishedAt: '2026-09-12T08:00:00.000Z',
    ...over,
  });

  async function loaded(list: JobOffer[], confirm = true) {
    TestBed.overrideProvider(MatDialog, {
      useValue: { open: vi.fn(() => ({ afterClosed: () => of(confirm) })) },
    });
    const fixture = TestBed.createComponent(CompanyOffersListPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/api/company/offers')).flush(list);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, http, page: fixture.componentInstance };
  }

  it('counts offers and offers Wycofaj only for published ones', async () => {
    const { fixture, http } = await loaded([
      offer({ id: 'o1' }),
      offer({ id: 'o2', title: 'Szkic oferty', published: false }),
    ]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.offers__counter')?.textContent).toContain('2 oferty · 1 opublikowana');
    expect([...el.querySelectorAll('button')].filter((b) => b.textContent?.includes('Wycofaj'))).toHaveLength(1);
    expect(el.textContent).toContain('Dodana 12 września 2026');
    http.verify();
  });

  it('deletes only after the dialog is confirmed', async () => {
    const { page, http } = await loaded([offer({})], true);
    const pending = page['confirmDelete'](offer({}));
    await Promise.resolve();
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/company/offers/o1')).flush(null);
    await new Promise((r) => setTimeout(r));
    http.expectOne((r) => r.method === 'GET').flush([]);
    await pending;
    http.verify();
  });

  it('keeps the offer when the dialog is cancelled', async () => {
    const { page, http } = await loaded([offer({})], false);
    await page['confirmDelete'](offer({}));
    http.expectNone((r) => r.method === 'DELETE');
    http.verify();
  });

  it('pluralises the offer count in Polish', () => {
    expect([1, 2, 5, 12, 22].map(offersLabel)).toEqual([
      '1 oferta',
      '2 oferty',
      '5 ofert',
      '12 ofert',
      '22 oferty',
    ]);
  });
});
