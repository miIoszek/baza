import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../core/auth-api.service';
import { trimmedEmailValidator } from '../../core/form-validators';
import { BazaAuthLayout, BazaBanner } from '../../ui';

@Component({
  selector: 'baza-forgot-password-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BazaAuthLayout,
    BazaBanner,
  ],
  template: `
    <baza-auth-layout
      title="Nie pamiętasz hasła?"
      subtitle="Wyślemy link do ustawienia nowego"
      footerLinkLabel="Wróć do logowania"
      footerLink="/login"
    >
      @if (sent()) {
        <baza-banner variant="success">
          Jeśli konto z tym adresem istnieje, wysłaliśmy na niego wiadomość z linkiem do resetu
          hasła. Link jest ważny 15 minut.
        </baza-banner>
      } @else {
        @if (error()) {
          <baza-banner class="forgot__banner">{{ error() }}</baza-banner>
        }
        <form class="forgot__form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              placeholder="biuro@twojafirma.pl"
            />
            <mat-error>Podaj poprawny adres email</mat-error>
          </mat-form-field>
          <button mat-flat-button type="submit" class="forgot__submit baza-glow" [disabled]="submitting()">
            <span class="forgot__submit-content">
              @if (submitting()) {
                <mat-progress-spinner class="baza-button-spinner" mode="indeterminate" diameter="20" aria-hidden="true" />
                Wysyłanie…
              } @else {
                Wyślij link
              }
            </span>
          </button>
        </form>
      }
    </baza-auth-layout>
  `,
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordPage {
  private readonly fb = new FormBuilder();
  private readonly api = inject(AuthApiService);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, trimmedEmailValidator()]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.api.forgotPassword(this.form.getRawValue().email.trim());
      this.sent.set(true);
    } catch (err: unknown) {
      this.error.set(AuthApiService.messageOf(err, 'Nie udało się wysłać wiadomości'));
    } finally {
      this.submitting.set(false);
    }
  }
}
