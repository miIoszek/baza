import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import type { RegisterCompanyResponse } from '@baza/shared-types';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import {
  matchesControlValidator,
  nipValidator,
  passwordPolicyValidator,
  trimmedEmailValidator,
} from '../../core/form-validators';
import { BazaAuthLayout, BazaBanner } from '../../ui';

/**
 * "Dalej" submits the form, and Material's default matcher then flags every invalid field of
 * step 2 before anyone touched it. Here a field shows its error once touched; each step marks
 * its own fields touched when it is checked.
 */
const touchedOnly: ErrorStateMatcher = {
  isErrorState: (control: AbstractControl | null) => !!(control?.invalid && control.touched),
};

/** Registration in two steps (canvas "Rejestracja"): the account, then the company. */
@Component({
  selector: 'baza-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ErrorStateMatcher, useValue: touchedOnly }],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BazaAuthLayout,
    BazaBanner,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterPage {
  private readonly fb = new FormBuilder();
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly step = signal<1 | 2>(1);
  protected readonly hidePassword = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    account: this.fb.nonNullable.group({
      email: ['', [Validators.required, trimmedEmailValidator(), Validators.maxLength(254)]],
      password: ['', [Validators.required, passwordPolicyValidator('email')]],
      confirmPassword: ['', [Validators.required, matchesControlValidator('password')]],
    }),
    company: this.fb.nonNullable.group({
      companyName: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
      ],
      nip: ['', [Validators.required, nipValidator()]],
      location: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      terms: [false, [Validators.requiredTrue]],
    }),
  });

  protected readonly account = this.form.controls.account;
  protected readonly company = this.form.controls.company;

  constructor() {
    // Cross-field rules read the sibling value, so re-run them when it changes.
    const { email, password, confirmPassword } = this.account.controls;
    const destroyRef = inject(DestroyRef);
    email.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => password.updateValueAndValidity({ emitEvent: false }));
    password.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => confirmPassword.updateValueAndValidity({ emitEvent: false }));
  }

  protected termsError(): boolean {
    const terms = this.company.controls.terms;
    return terms.invalid && (terms.touched || this.submitAttempted());
  }

  protected back(): void {
    this.error.set(null);
    this.step.set(1);
  }

  protected async onSubmit(): Promise<void> {
    if (this.step() === 1) {
      this.goToCompanyStep();
      return;
    }
    this.submitAttempted.set(true);
    if (this.company.invalid || this.submitting()) {
      this.company.markAllAsTouched();
      return;
    }

    const { account, company } = this.form.getRawValue();
    const email = account.email.trim();
    const formData = new FormData();
    formData.append('name', company.companyName.trim());
    formData.append('nip', company.nip.replace(/[\s-]/g, ''));
    formData.append('email', email);
    formData.append('password', account.password);
    formData.append('description', company.description.trim());
    formData.append('baseLocation', company.location.trim());
    formData.append('termsAccepted', String(company.terms));

    this.submitting.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<RegisterCompanyResponse>(
          `${environment.apiBaseUrl}/api/auth/register`,
          formData
        )
      );
      if (result.emailVerificationRequired) {
        await this.router.navigate(['/check-email'], { queryParams: { email } });
        return;
      }
      const { error } = await this.auth.signIn(email, account.password);
      if (error) {
        this.error.set(error);
        return;
      }
      await this.router.navigateByUrl('/company/profile');
    } catch (err: unknown) {
      this.error.set(messageOf(err));
      if (err instanceof HttpErrorResponse && err.error?.code === 'WEAK_PASSWORD') {
        this.step.set(1);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private goToCompanyStep(): void {
    if (this.account.invalid) {
      this.account.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.step.set(2);
    // Keyboard and screen-reader users land on the first field of the new step.
    setTimeout(() => document.getElementById('register-company-name')?.focus());
  }
}

function messageOf(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Brak połączenia z serwerem. Spróbuj ponownie.';
    }
    const message = (err.error as { message?: string | string[] } | null)?.message;
    if (message) {
      return Array.isArray(message) ? message.join(', ') : message;
    }
  }
  return 'Rejestracja nie powiodła się';
}
