import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { RegisterPage } from './register';

describe('RegisterPage', () => {
  let http: HttpTestingController;

  async function setup() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RegisterPage, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { signIn: vi.fn() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return { fixture, page: fixture.componentInstance, navigate };
  }

  afterEach(() => http.verify());

  const fillAccount = (page: RegisterPage, password = 'mocne-haslo-2026') =>
    page['account'].setValue({
      email: 'biuro@firma.pl',
      password,
      confirmPassword: password,
    });

  it('keeps step 1 until the account follows the password policy', async () => {
    const { page } = await setup();
    fillAccount(page, 'krotkie');
    await page['onSubmit']();
    expect(page['step']()).toBe(1);

    fillAccount(page);
    await page['onSubmit']();
    expect(page['step']()).toBe(2);
  });

  it('opens step 2 without errors on untouched fields', async () => {
    const { fixture, page } = await setup();
    fillAccount(page);
    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    expect(form).not.toBeNull();
    form?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page['step']()).toBe(2);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('mat-error')).toHaveLength(0);
  });

  it('does not send a NIP with a wrong checksum', async () => {
    const { page } = await setup();
    fillAccount(page);
    await page['onSubmit']();
    page['company'].setValue({
      companyName: 'Transgór Logistics',
      nip: '1234563219',
      description: 'Plandeki PL–IT',
      terms: true,
    });
    await page['onSubmit']();
    http.expectNone((r) => r.url.includes('/api/auth/register'));
    expect(page['company'].controls.nip.hasError('nip')).toBe(true);
  });

  it('registers and asks to confirm the e-mail', async () => {
    const { page, navigate } = await setup();
    fillAccount(page);
    await page['onSubmit']();
    page['company'].setValue({
      companyName: ' Transgór Logistics ',
      nip: '123-456-32-18',
      description: 'Plandeki PL–IT',
      terms: true,
    });
    const pending = page['onSubmit']();
    const req = http.expectOne((r) => r.url.includes('/api/auth/register'));
    const body = req.request.body as FormData;
    expect(body.get('name')).toBe('Transgór Logistics');
    expect(body.get('nip')).toBe('1234563218');
    expect(body.get('email')).toBe('biuro@firma.pl');
    expect(body.get('baseLocation')).toBeNull();
    expect(body.get('termsAccepted')).toBe('true');
    req.flush({ emailVerificationRequired: true });
    await pending;
    expect(navigate).toHaveBeenCalledWith(['/check-email'], {
      queryParams: { email: 'biuro@firma.pl' },
    });
  });
});
