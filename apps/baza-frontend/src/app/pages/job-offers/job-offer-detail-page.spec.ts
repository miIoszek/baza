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
import type { JobOffer } from '@baza/shared-types';
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
  routes: [
    {
      from: { code: 'PL', name: 'Polska' },
      to: { code: 'DE', name: 'Niemcy' },
    },
  ],
  salary: undefined,
  published: true,
  publishedAt: '2026-09-11T00:00:00.000Z',
  baseLocation: { lat: 52.2, lng: 21.0 },
  companyBaseLocationText: 'Warszawa',
};

describe('JobOfferDetailPage apply form', () => {
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
          useValue: {
            snapshot: { paramMap: { get: () => 'offer-1' } },
          },
        },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: true, breakpoints: {} }),
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  async function loadPage(): Promise<JobOfferDetailPage> {
    const fixture = TestBed.createComponent(JobOfferDetailPage);
    fixture.detectChanges();
    http
      .expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/offers/offer-1')
      )
      .flush(OFFER);
    http
      .expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/geo/countries')
      )
      .flush([]);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function selectPdf(page: JobOfferDetailPage): void {
    const file = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    page['onCvSelected']({ target: input } as unknown as Event);
  }

  it('requires consent before apply', async () => {
    const page = await loadPage();
    page['applyForm'].patchValue({
      email: 'driver@example.com',
      phone: '123456789',
      message: '',
      consentAccepted: false,
    });
    selectPdf(page);

    await page['onApply']();

    expect(page['applyForm'].controls.consentAccepted.invalid).toBe(true);
    expect(page['applySuccess']()).toBe(false);
    http.expectNone(
      (r) => r.method === 'POST' && r.url.includes('/applications')
    );
  });

  it('posts multipart apply and shows success', async () => {
    const page = await loadPage();
    page['applyForm'].patchValue({
      email: 'driver@example.com',
      phone: '123456789',
      message: 'Cześć',
      consentAccepted: true,
    });
    selectPdf(page);

    const pending = page['onApply']();
    const req = http.expectOne(
      (r) =>
        r.method === 'POST' &&
        r.url.includes('/api/offers/offer-1/applications')
    );
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({
      id: 'app-1',
      jobOfferId: 'offer-1',
      email: 'driver@example.com',
      phone: '123456789',
      createdAt: '2026-09-11T20:00:00.000Z',
    });
    await pending;

    expect(page['applySuccess']()).toBe(true);
    expect(page['applyForm'].controls.consentAccepted.value).toBe(false);
  });
});
