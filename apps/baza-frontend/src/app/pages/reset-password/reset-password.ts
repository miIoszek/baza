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
import { passwordPolicyValidator } from '../../core/form-validators';
import { BazaAuthLayout, BazaBanner } from '../../ui';

@Component({
  selector: 'baza-reset-password-page',
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
  template: `
    <baza-auth-layout
      title="Ustaw nowe hasło"
      subtitle="Min. 10 znaków, co najmniej 4 różne"
      footerLinkLabel="Wróć do logowania"
      footerLink="/login"
    >
      @if (!token) {
        <baza-banner>
          Link jest nieprawidłowy. <a class="reset__link" routerLink="/forgot-password">Poproś o nowy</a>.
        </baza-banner>
      } @else {
        @if (error()) {
          <baza-banner class="reset__banner">
            {{ error() }} <a class="reset__link" routerLink="/forgot-password">Poproś o nowy link</a>.
          </baza-banner>
        }
        <form class="reset__form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Nowe hasło</mat-label>
            <input
              matInput
              [type]="hide() ? 'password' : 'text'"
              formControlName="password"
              autocomplete="new-password"
            />
            <button
              mat-icon-button
              matIconSuffix
              type="button"
              [attr.aria-label]="hide() ? 'Pokaż hasło' : 'Ukryj hasło'"
              [attr.aria-pressed]="!hide()"
              (click)="hide.set(!hide())"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            @if (form.controls.password.hasError('required')) {
              <mat-error>Podaj nowe hasło</mat-error>
            } @else {
              <mat-error>Min. 10 znaków (max 128), co najmniej 4 różne</mat-error>
            }
          </mat-form-field>
          <button mat-flat-button type="submit" class="reset__submit baza-glow" [disabled]="submitting()">
            <span class="reset__submit-content">
              @if (submitting()) {
                <mat-progress-spinner class="baza-button-spinner" mode="indeterminate" diameter="20" aria-hidden="true" />
                Zapisywanie…
              } @else {
                Zapisz hasło
              }
            </span>
          </button>
        </form>
      }
    </baza-auth-layout>
  `,
  styleUrl: './reset-password.scss',
})
export class ResetPasswordPage {
  private readonly fb = new FormBuilder();
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  protected readonly hide = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    // The e-mail is unknown here; the API also rejects a password equal to it.
    password: ['', [Validators.required, passwordPolicyValidator()]],
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
      await this.router.navigate(['/login'], { queryParams: { reset: 1 } });
    } catch (err: unknown) {
      this.error.set(AuthApiService.messageOf(err, 'Nie udało się zmienić hasła'));
    } finally {
      this.submitting.set(false);
    }
  }
}
