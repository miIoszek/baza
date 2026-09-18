import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../core/auth-api.service';

@Component({
  selector: 'baza-forgot-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <section class="auth-page">
      <mat-card class="auth-card baza-glass-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>Nie pamiętasz hasła?</mat-card-title>
          <mat-card-subtitle>Wyślemy link do ustawienia nowego</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (sent()) {
            <p role="status">
              Jeśli konto z tym adresem istnieje, wysłaliśmy na niego wiadomość z linkiem do resetu
              hasła. Link jest ważny 15 minut.
            </p>
          } @else {
            <form class="auth-form" [formGroup]="form" (ngSubmit)="onSubmit()">
              <mat-form-field class="auth-field">
                <mat-label>Email</mat-label>
                <mat-icon matPrefix>mail</mat-icon>
                <input matInput type="email" formControlName="email" autocomplete="email" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <mat-error>Podaj poprawny adres email</mat-error>
                }
              </mat-form-field>
              @if (error()) {
                <p class="auth-field-error" role="alert">{{ error() }}</p>
              }
              <button
                mat-flat-button
                color="primary"
                class="baza-btn-premium full-width"
                type="submit"
                [disabled]="submitting()"
              >
                Wyślij link
              </button>
            </form>
          }
        </mat-card-content>
        <mat-card-footer class="auth-footer">
          <a routerLink="/login">Wróć do logowania</a>
        </mat-card-footer>
      </mat-card>
    </section>
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
    email: ['', [Validators.required, Validators.email]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.api.forgotPassword(this.form.getRawValue().email);
      this.sent.set(true);
    } catch (err: unknown) {
      this.error.set(AuthApiService.messageOf(err, 'Nie udało się wysłać wiadomości'));
    } finally {
      this.submitting.set(false);
    }
  }
}
