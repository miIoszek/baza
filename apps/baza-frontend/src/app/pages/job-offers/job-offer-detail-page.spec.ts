import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { DUPLICATE_APPLICATION_MESSAGE, type JobOffer } from '@baza/shared-types';
import type { BazaApplicationSubmit } from '../../ui';
import { JobOfferDetailPage } from './job-offer-detail-page';

const OFFER: JobOffer = {
  id: 'offer-1',
  companyId: 'company-1',
  title: 'Kierowca C+E',
  description: 'Trasy PL-DE',
  homeReturnCadence: 'weekly',
  requiredYearsExperience: 2,
  requiredTransportType: 'curtain',
  licenseCategory: 'C_E',
  employmentForms: ['uop'],
  routes: [
    {
      from: { code: 'PL', name: 'Polska' },
      to: { code: 'DE', name: 'Niemcy' },
    },
  ],
  salary: { min: 8000, max: 10000, currency: 'PLN' },
  published: true,
  publishedAt: '2026-09-11T00:00:00.000Z',
  baseLocation: { lat: 52.2, lng: 21.0 },
  companyBaseLocationText: 'Warszawa',
  companyName: 'Acme Transport',
  companyPhotoUrls: null,
};

const SUBMIT: BazaApplicationSubmit = {
  email: 'driver@example.com',
  phone: '123456789',
  message: 'Cześć',
  cv: new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }),
};

describe('JobOfferDetailPage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [JobOfferDetailPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'offer-1' } } },
        },
        {
          // Mobile layout: no Leaflet map pane in the DOM under test.
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function loadPage() {
    const fixture = TestBed.createComponent(JobOfferDetailPage);
    fixture.detectChanges();
    http
      .expectOne((r) => r.method === 'GET' && r.url.includes('/api/offers/offer-1'))
      .flush(OFFER);
    http
      .expectOne((r) => r.method === 'GET' && r.url.includes('/api/geo/countries'))
      .flush([]);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance };
  }

  function expectApplicationPost() {
    return http.expectOne(
      (r) => r.method === 'POST' && r.url.includes('/api/offers/offer-1/applications')
    );
  }

  it('renders the offer facts with the hierarchy from the design', () => {
    const { fixture } = loadPage();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Kierowca C+E');
    expect(el.querySelector('.offer-detail__routes')?.textContent).toContain(
      'Polska (PL) → Niemcy (DE)'
    );
    expect(el.textContent).toContain('2 lata');
    expect(el.querySelector('.offer-detail__salary')?.textContent).toContain(
      '8 000–10 000 PLN'
    );
  });

  it('posts multipart apply and switches to the sent state', async () => {
    const { page } = loadPage();
    const pending = page['onApply'](SUBMIT);
    const req = expectApplicationPost();
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('consentAccepted')).toBe('true');
    req.flush({
      id: 'app-1',
      jobOfferId: 'offer-1',
      email: SUBMIT.email,
      phone: SUBMIT.phone,
      createdAt: '2026-09-11T20:00:00.000Z',
    });
    await pending;
    expect(page['applyState']()).toBe('sent');
  });

  it('shows the duplicate state on 409', async () => {
    const { page } = loadPage();
    const pending = page['onApply'](SUBMIT);
    expectApplicationPost().flush(
      { statusCode: 409, message: DUPLICATE_APPLICATION_MESSAGE },
      { status: 409, statusText: 'Conflict' }
    );
    await pending;
    expect(page['applyState']()).toBe('error-duplicate');
  });

  it('keeps the generic hint for a connection failure', async () => {
    const { page } = loadPage();
    const pending = page['onApply'](SUBMIT);
    expectApplicationPost().error(new ProgressEvent('error'), { status: 0 });
    await pending;
    expect(page['applyState']()).toBe('error-network');
    expect(page['applyErrorMessage']()).toBeNull();
  });

  it('shows the API reason for a rejected request', async () => {
    const { page } = loadPage();
    const pending = page['onApply'](SUBMIT);
    expectApplicationPost().flush(
      { statusCode: 404, message: 'Oferta nie znaleziona' },
      { status: 404, statusText: 'Not Found' }
    );
    await pending;
    expect(page['applyState']()).toBe('error-network');
    expect(page['applyErrorMessage']()).toBe('Oferta nie znaleziona');
  });
});
