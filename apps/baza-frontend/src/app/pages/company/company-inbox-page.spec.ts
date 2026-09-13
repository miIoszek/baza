import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CompanyInboxPage } from './company-inbox-page';

describe('CompanyInboxPage', () => {
  let fixture: ComponentFixture<CompanyInboxPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyInboxPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyInboxPage);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows empty state when there are no applications', async () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) =>
      r.url.endsWith('/api/company/applications')
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Brak aplikacji');
  });

  it('lists applications with download control', async () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) =>
      r.url.endsWith('/api/company/applications')
    );
    req.flush([
      {
        id: 'app-1',
        jobOfferId: 'offer-1',
        jobOfferTitle: 'Trasa IT',
        email: 'driver@example.com',
        phone: '123456789',
        createdAt: '2026-09-13T12:00:00.000Z',
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('driver@example.com');
    expect(text).toContain('Trasa IT');
    expect(text).toContain('Pobierz CV');
  });
});
