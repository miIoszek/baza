import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { describe, expect, it, vi } from 'vitest';
import { CompanyDirectoryPage } from './company-directory-page';

describe('CompanyDirectoryPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyDirectoryPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('loads companies and shows name and offer count', async () => {
    const fixture = TestBed.createComponent(CompanyDirectoryPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.endsWith('/api/companies'));
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 'company-1',
        name: 'Acme Transport',
        baseLocation: 'Warsaw',
        photoUrls: null,
        offerCount: 3,
      },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Acme Transport');
    expect(text).toContain('Oferty: 3');
    expect(text).toContain('Warsaw');
    http.verify();
  });

  it('hides blank address and still shows Oferty: 0', async () => {
    const fixture = TestBed.createComponent(CompanyDirectoryPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/api/companies')).flush([
      {
        id: 'company-2',
        name: 'Empty Addr',
        baseLocation: '   ',
        photoUrls: null,
        offerCount: 0,
      },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Empty Addr');
    expect(text).toContain('Oferty: 0');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.company-directory__loc'
      )
    ).toBeNull();
    http.verify();
  });

  it('shows empty copy when the list is empty', async () => {
    const fixture = TestBed.createComponent(CompanyDirectoryPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/api/companies')).flush([]);

    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Brak pracodawców.'
    );
    http.verify();
  });

  it('shows retry copy on HTTP error and reloads on click', async () => {
    const fixture = TestBed.createComponent(CompanyDirectoryPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/api/companies')).flush(
      { message: 'fail' },
      { status: 500, statusText: 'Server Error' }
    );

    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nie udało się pobrać listy pracodawców');
    expect(el.textContent).toContain('Spróbuj ponownie');

    el.querySelector('button')?.click();
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/api/companies')).flush([
      {
        id: 'company-1',
        name: 'Acme Transport',
        baseLocation: 'Warsaw',
        photoUrls: null,
        offerCount: 1,
      },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Acme Transport'
    );
    http.verify();
  });

  it('navigates to the public profile when a card is clicked', async () => {
    const fixture = TestBed.createComponent(CompanyDirectoryPage);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/api/companies')).flush([
      {
        id: 'company-1',
        name: 'Acme Transport',
        baseLocation: 'Warsaw',
        photoUrls: null,
        offerCount: 1,
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector('article')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).toHaveBeenCalledWith(['/companies', 'company-1']);
    http.verify();
  });
});
