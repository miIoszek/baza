import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthApiService } from '../../core/auth-api.service';

@Component({
  selector: 'baza-reset-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <section class="auth-page">
      <mat-card class="auth-card baza-glass-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>Ustaw nowe hasło</mat-card-title>
          <mat-card-subtitle>10-128 znaków, co najmniej 4 różne</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!token) {
            <p role="alert">Link jest nieprawidłowy. <a routerLink="/forgot-password">Poproś o nowy</a>.</p>
          } @else {
            <form class="auth-form" [formGroup]="form" (ngSubmit)="onSubmit()">
              <mat-form-field class="auth-field">
                <mat-label>Nowe hasło</mat-label>
                <mat-icon matPrefix>lock</mat-icon>
                <input
                  matInput
                  [type]="hide() ? 'password' : 'text'"
                  formControlName="password"
                  autocomplete="new-password"
                />
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  (click)="hide.set(!hide())"
                  [attr.aria-label]="hide() ? 'Pokaż hasło' : 'Ukryj hasło'"
                >
                  <mat-icon>{{ hide() ? 'visibility' : 'visibility_off' }}</mat-icon>
                </button>
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <mat-error>Hasło musi mieć od 10 do 128 znaków</mat-error>
                }
              </mat-form-field>
              @if (error()) {
                <p class="auth-field-error" role="alert">
                  {{ error() }} <a routerLink="/forgot-password">Poproś o nowy link</a>
                </p>
              }
              <button
                mat-flat-button
                color="primary"
                class="baza-btn-premium full-width"
                type="submit"
                [disabled]="submitting()"
              >
                Zapisz hasło
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styleUrl: './reset-password.scss',
})
export class ResetPasswordPage {
  private readonly fb = new FormBuilder();
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  protected readonly hide = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]],
  });

  protected async onSubmit(): Promise<void> {
    if (!this.token || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.api.resetPassword(this.token, this.form.getRawValue().password);
      this.snackBar.open('Hasło zmienione. Zaloguj się nowym hasłem.', 'OK', { duration: 6000 });
      await this.router.navigateByUrl('/login');
    } catch (err: unknown) {
      this.error.set(AuthApiService.messageOf(err, 'Nie udało się zmienić hasła'));
    } finally {
      this.submitting.set(false);
    }
  }
}
