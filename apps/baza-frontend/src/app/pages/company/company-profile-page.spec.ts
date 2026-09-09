import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { type Mock, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { CompanyProfilePage } from './company-profile-page';

describe('CompanyProfilePage', () => {
  let auth: {
    whenReady: Mock;
    refreshMe: Mock;
    company: Mock;
  };

  beforeEach(async () => {
    auth = {
      whenReady: vi.fn().mockResolvedValue(undefined),
      refreshMe: vi.fn().mockResolvedValue(undefined),
      company: vi.fn().mockReturnValue({
        id: 'company-1',
        name: 'Acme Transport',
        nip: '1234567890',
        description: 'Fleet',
        baseLocation: 'Warsaw',
        photoUrls: null,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [CompanyProfilePage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  it('marks form invalid for NIP that is not 10 digits', async () => {
    const fixture = TestBed.createComponent(CompanyProfilePage);
    const page = fixture.componentInstance;
    await page.ngOnInit();
    fixture.detectChanges();

    page['form'].controls.nip.setValue('123');
    page['form'].controls.nip.markAsTouched();

    expect(page['form'].controls.nip.invalid).toBe(true);
    expect(page['form'].controls.nip.hasError('pattern')).toBe(true);
  });

  it('marks form invalid when description exceeds max length', async () => {
    const fixture = TestBed.createComponent(CompanyProfilePage);
    const page = fixture.componentInstance;
    await page.ngOnInit();
    fixture.detectChanges();

    page['form'].controls.description.setValue('x'.repeat(2001));

    expect(page['form'].controls.description.hasError('maxlength')).toBe(true);
  });

  it('prefils form from AuthService.company', async () => {
    const fixture = TestBed.createComponent(CompanyProfilePage);
    const page = fixture.componentInstance;
    await page.ngOnInit();

    expect(page['form'].getRawValue()).toEqual({
      name: 'Acme Transport',
      nip: '1234567890',
      baseLocation: 'Warsaw',
      description: 'Fleet',
    });
    expect(page['companyId']()).toBe('company-1');
  });
});
