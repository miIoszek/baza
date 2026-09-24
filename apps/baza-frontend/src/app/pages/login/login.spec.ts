import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { AuthApiService } from '../../core/auth-api.service';
import { AuthService } from '../../core/auth.service';
import { LoginPage } from './login';

describe('LoginPage', () => {
  const signIn = vi.fn();
  const resendVerification = vi.fn();

  async function setup(query: Record<string, string> = {}) {
    signIn.mockReset();
    resendVerification.mockReset().mockResolvedValue(undefined);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginPage, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signIn } },
        { provide: AuthApiService, useValue: { resendVerification } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: new Map(Object.entries(query)) } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page['form'].setValue({ email: ' biuro@firma.pl ', password: 'haslo-firmowe' });
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    return { fixture, page, navigate };
  }

  const text = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.textContent ?? '';

  it('shows the canvas copy for wrong credentials', async () => {
    const { fixture, page } = await setup();
    signIn.mockResolvedValue({ error: 'x', code: 'INVALID_CREDENTIALS' });
    await page['onSubmit']();
    fixture.detectChanges();
    expect(signIn).toHaveBeenCalledWith('biuro@firma.pl', 'haslo-firmowe');
    expect(text(fixture)).toContain(
      'Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.'
    );
  });

  it('offers to resend the link for an unverified address', async () => {
    const { fixture, page } = await setup();
    signIn.mockResolvedValue({ error: 'Potwierdź adres email', code: 'EMAIL_NOT_VERIFIED' });
    await page['onSubmit']();
    fixture.detectChanges();
    await page['resendVerification']();
    fixture.detectChanges();
    expect(resendVerification).toHaveBeenCalledWith('biuro@firma.pl');
    expect(text(fixture)).toContain('Wysłaliśmy nowy link');
  });

  it('goes to a same-site returnUrl only', async () => {
    const { page, navigate } = await setup({ returnUrl: '//evil.example' });
    signIn.mockResolvedValue({ error: null });
    await page['onSubmit']();
    expect(navigate).toHaveBeenCalledWith('/company/profile');
  });

  it('confirms a password reset', async () => {
    const { fixture } = await setup({ reset: '1' });
    expect(text(fixture)).toContain('Hasło zmienione. Zaloguj się nowym hasłem.');
  });
});
