import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { describe, expect, it, vi } from 'vitest';
import { CompanyOffersListPage } from './company-offers-list-page';

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
});
