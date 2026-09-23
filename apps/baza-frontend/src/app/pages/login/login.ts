import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../core/auth-api.service';
import { AuthService } from '../../core/auth.service';
import { trimmedEmailValidator } from '../../core/form-validators';
import { BazaAuthLayout, BazaBanner } from '../../ui';

/** Copy from the canvas; shown for wrong credentials (the API never says which part). */
const INVALID_CREDENTIALS_TEXT =
  'Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.';

type LoginProblem =
  | { kind: 'error'; text: string }
  | { kind: 'unverified'; text: string; resent: boolean };

@Component({
  selector: 'baza-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BazaAuthLayout,
    BazaBanner,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly fb = new FormBuilder();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApiService);

  protected readonly hidePassword = signal(true);
  protected readonly submitting = signal(false);
  protected readonly problem = signal<LoginProblem | null>(null);
  /** Arrived from the reset-password screen after a successful change. */
  protected readonly passwordReset =
    this.route.snapshot.queryParamMap.get('reset') === '1';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, trimmedEmailValidator()]],
    password: ['', [Validators.required]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.problem.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      const { error, code } = await this.auth.signIn(email.trim(), password);
      if (error) {
        this.problem.set(
          code === 'EMAIL_NOT_VERIFIED'
            ? { kind: 'unverified', text: error, resent: false }
            : {
                kind: 'error',
                text: code === 'INVALID_CREDENTIALS' ? INVALID_CREDENTIALS_TEXT : error,
              }
        );
        return;
      }
      await this.router.navigateByUrl(
        this.resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'))
      );
    } catch (err: unknown) {
      this.problem.set({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Nie udało się zalogować',
      });
    } finally {
      this.submitting.set(false);
    }
  }

  protected async resendVerification(): Promise<void> {
    const problem = this.problem();
    if (problem?.kind !== 'unverified') {
      return;
    }
    // The endpoint answers the same for every address; nothing to show on failure.
    await this.authApi
      .resendVerification(this.form.getRawValue().email.trim())
      .catch(() => undefined);
    this.problem.set({ ...problem, resent: true });
  }

  private resolveReturnUrl(raw: string | null): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/company/profile';
    }
    return raw;
  }
}
