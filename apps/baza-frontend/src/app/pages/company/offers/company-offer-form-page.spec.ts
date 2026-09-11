import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { type Mock, vi } from 'vitest';
import { AuthService } from '../../../core/auth.service';
import { CompanyOfferFormPage } from './company-offer-form-page';

describe('CompanyOfferFormPage', () => {
  let auth: { whenReady: Mock };

  beforeEach(async () => {
    auth = {
      whenReady: vi.fn().mockResolvedValue(undefined),
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
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
    }).compileComponents();
  });

  it('requires title with min length 2', async () => {
    const fixture = TestBed.createComponent(CompanyOfferFormPage);
    const page = fixture.componentInstance;
    await page.ngOnInit();

    page['form'].controls.title.setValue('A');
    expect(page['form'].controls.title.hasError('minlength')).toBe(true);
  });

  it('rejects negative years of experience', async () => {
    const fixture = TestBed.createComponent(CompanyOfferFormPage);
    const page = fixture.componentInstance;
    await page.ngOnInit();

    page['form'].controls.requiredYearsExperience.setValue(-1);
    expect(page['form'].controls.requiredYearsExperience.hasError('min')).toBe(
      true
    );
  });

  it('rejects salary min greater than max', async () => {
    const fixture = TestBed.createComponent(CompanyOfferFormPage);
    const page = fixture.componentInstance;
    await page.ngOnInit();

    page['form'].patchValue({
      salaryMin: 7000,
      salaryMax: 5000,
      salaryCurrency: 'PLN',
    });
    page['form'].updateValueAndValidity();

    expect(page['form'].hasError('salaryRange')).toBe(true);
  });

  it('requires 3-letter currency when salary amount is set', async () => {
    const fixture = TestBed.createComponent(CompanyOfferFormPage);
    const page = fixture.componentInstance;
    await page.ngOnInit();

    page['form'].patchValue({
      salaryMin: 5000,
      salaryCurrency: 'PL',
    });
    page['form'].updateValueAndValidity();

    expect(page['form'].hasError('salaryCurrencyRequired')).toBe(true);
  });

  it('keeps at least one route after remove', async () => {
    const fixture = TestBed.createComponent(CompanyOfferFormPage);
    const page = fixture.componentInstance;
    await page.ngOnInit();

    expect(page['routes'].length).toBe(1);
    page['removeRoute'](0);
    expect(page['routes'].length).toBe(1);
  });
});
