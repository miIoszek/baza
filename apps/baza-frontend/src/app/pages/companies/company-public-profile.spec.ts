import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CompanyPublicProfilePage } from './company-public-profile';

describe('CompanyPublicProfilePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyPublicProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'company-1' } },
          },
        },
      ],
    }).compileComponents();
  });

  it('loads public profile on success', async () => {
    const fixture = TestBed.createComponent(CompanyPublicProfilePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.includes('/api/companies/company-1'));
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'company-1',
      name: 'Acme',
      nip: '1234567890',
      description: 'Fleet',
      baseLocation: 'Warsaw',
      photoUrls: null,
    });

    await fixture.whenStable();
    fixture.detectChanges();

    const offersReq = http.expectOne((r) =>
      r.url.includes('/api/companies/company-1/offers')
    );
    expect(offersReq.request.method).toBe('GET');
    offersReq.flush([]);

    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Acme');
    http.verify();
  });

  it('shows not-found state on 404', async () => {
    const fixture = TestBed.createComponent(CompanyPublicProfilePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.includes('/api/companies/company-1'));
    req.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['notFound']()).toBe(true);
    http.verify();
  });

  it('shows offers error state when offers request fails', async () => {
    const fixture = TestBed.createComponent(CompanyPublicProfilePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne((r) => r.url.includes('/api/companies/company-1'))
      .flush({
        id: 'company-1',
        name: 'Acme',
        nip: '1234567890',
        description: 'Fleet',
        baseLocation: 'Warsaw',
        photoUrls: null,
      });

    await fixture.whenStable();
    fixture.detectChanges();

    http
      .expectOne((r) => r.url.includes('/api/companies/company-1/offers'))
      .flush(
        { message: 'fail' },
        { status: 500, statusText: 'Server Error' }
      );

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['offersError']()).toContain(
      'Nie udało się pobrać ofert'
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Spróbuj ponownie'
    );
    http.verify();
  });
});
