import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyJobApplicationListItem } from '@baza/shared-types';
import { CompanyInboxPage, cvDownloadName, sentAt, telHref } from './company-inbox-page';

const APPS: CompanyJobApplicationListItem[] = [
  {
    id: 'app-1',
    jobOfferId: 'offer-1',
    jobOfferTitle: 'Kierowca C+E — trasy PL–IT',
    email: 'jan.kowalski@example.com',
    phone: '+48 600 100 200',
    message: 'Jeżdżę 6 lat na plandece.',
    cvFileName: 'CV Jan Kowalski.pdf',
    createdAt: '2026-09-17T08:14:00',
  },
  {
    id: 'app-2',
    jobOfferId: 'offer-2',
    jobOfferTitle: 'Kierowca C — chłodnia',
    email: 'piotr.nowak@example.com',
    phone: '511222333',
    cvFileName: null,
    createdAt: '2026-09-16T19:02:00',
  },
];

// jsdom's Blob has no text(); every browser Baza supports has it.
if (!Blob.prototype.text) {
  Blob.prototype.text = function (this: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(this);
    });
  };
}

describe('CompanyInboxPage', () => {
  let fixture: ComponentFixture<CompanyInboxPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyInboxPage, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyInboxPage);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function load(body: object, status = 200): Promise<void> {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/company/applications'));
    expect(req.request.method).toBe('GET');
    if (status === 200) {
      req.flush(body);
    } else {
      req.flush(body, { status, statusText: 'Error' });
    }
    await settle();
  }

  it('shows "Ładowanie…" and skeletons until the list arrives', async () => {
    fixture.detectChanges();
    expect(text()).toContain('Ładowanie…');
    expect(el().querySelectorAll('baza-skeleton').length).toBeGreaterThan(0);
    httpMock.expectOne((r) => r.url.endsWith('/api/company/applications')).flush([]);
    await settle();
    expect(text()).not.toContain('Ładowanie…');
  });

  it('shows the empty state when there are no applications', async () => {
    await load([]);
    expect(text()).toContain('Brak aplikacji.');
    expect(el().querySelector('.inbox__counter')?.textContent).toContain('0 aplikacji');
  });

  it('lists applications with contact links, message and the CV file name', async () => {
    await load(APPS);

    expect(el().querySelector('.inbox__counter')?.textContent).toContain('2 aplikacje');
    expect(el().querySelectorAll('.inbox__card').length).toBe(2);
    expect(text()).toContain('Kierowca C+E — trasy PL–IT');
    expect(text()).toContain('17 września 2026, 08:14');
    expect(text()).toContain('Jeżdżę 6 lat na plandece.');
    expect(text()).toContain('CV Jan Kowalski.pdf');
    // No stored name (older applications): the name the download will get
    expect(text()).toContain('cv-piotr.nowak_example.com.pdf');
    // Only the first application has a message
    expect(el().querySelectorAll('.inbox__message').length).toBe(1);

    const email = el().querySelector<HTMLAnchorElement>('.inbox__email');
    const phone = el().querySelector<HTMLAnchorElement>('.inbox__phone');
    expect(email?.getAttribute('href')).toBe('mailto:jan.kowalski@example.com');
    expect(phone?.getAttribute('href')).toBe('tel:+48600100200');

    const buttons = el().querySelectorAll('.inbox__cv button');
    expect(buttons[0].textContent).toContain('Pobierz CV');
    expect(buttons[0].getAttribute('aria-label')).toBe('Pobierz CV od jan.kowalski@example.com');
  });

  it('shows the error state instead of an empty inbox when loading fails, and retries', async () => {
    await load({ message: 'boom' }, 500);

    expect(text()).toContain('Nie udało się wczytać aplikacji');
    expect(text()).toContain('Aplikacje są bezpieczne — to problem z połączeniem.');
    expect(text()).not.toContain('Brak aplikacji.');
    expect(el().querySelector('.inbox__counter')).toBeNull();

    const retry = Array.from(el().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Spróbuj ponownie')
    );
    retry?.click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/api/company/applications')).flush(APPS);
    await settle();

    expect(text()).not.toContain('Nie udało się wczytać aplikacji');
    expect(el().querySelectorAll('.inbox__card').length).toBe(2);
    // The retry button is gone; focus is on the page heading, not lost to <body>
    expect(document.activeElement?.textContent).toContain('Skrzynka aplikacji');
  });

  it('saves the CV under the name the driver uploaded', async () => {
    await load(APPS);
    // jsdom has no object URLs; left in place so the delayed revoke after the test is harmless.
    const createUrl = vi.fn(() => 'blob:cv');
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    let savedAs = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      savedAs = this.download;
    });

    el().querySelector<HTMLButtonElement>('.inbox__cv button')?.click();
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/company/applications/app-1/cv'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await settle();

    expect(createUrl).toHaveBeenCalled();
    expect(savedAs).toBe('CV Jan Kowalski.pdf');
  });

  it('tells the company when the CV cannot be downloaded', async () => {
    await load(APPS);
    const page = fixture.componentInstance;
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');

    // Awaited directly: reading the error Blob finishes outside Angular's stability tracking.
    let pending = page['downloadCv'](APPS[0]);
    httpMock
      .expectOne((r) => r.url.endsWith('/api/company/applications/app-1/cv'))
      .flush(new Blob([JSON.stringify({ message: 'Nie znaleziono CV' })]), {
        status: 404,
        statusText: 'Not Found',
      });
    await pending;
    expect(open).toHaveBeenCalledWith('Nie znaleziono CV', 'OK', { duration: 6000 });

    pending = page['downloadCv'](APPS[1]);
    httpMock
      .expectOne((r) => r.url.endsWith('/api/company/applications/app-2/cv'))
      .flush(new Blob([JSON.stringify({ message: 'Internal server error' })]), {
        status: 500,
        statusText: 'Server Error',
      });
    await pending;
    expect(open).toHaveBeenLastCalledWith('Nie udało się pobrać CV. Spróbuj ponownie.', 'OK', {
      duration: 6000,
    });
  });
});

describe('inbox helpers', () => {
  it('formats the sent date the way the canvas shows it', () => {
    expect(sentAt('2026-09-17T08:14:00')).toBe('17 września 2026, 08:14');
    expect(sentAt('not a date')).toBe('');
  });

  it('keeps the driver file name and always ends it in .pdf', () => {
    expect(cvDownloadName({ cvFileName: 'CV Jan.pdf', email: 'a@b.pl' })).toBe('CV Jan.pdf');
    expect(cvDownloadName({ cvFileName: 'moje-cv', email: 'a@b.pl' })).toBe('moje-cv.pdf');
    expect(cvDownloadName({ cvFileName: null, email: 'jan+x@b.pl' })).toBe('cv-jan_x_b.pl.pdf');
  });

  it('builds a dialable phone link', () => {
    expect(telHref('+48 600-100 (200)')).toBe('tel:+48600100200');
  });
});
