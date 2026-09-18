import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AuthApiService } from '../../core/auth-api.service';

/** Shown after registration when the address still has to be verified. */
@Component({
  selector: 'baza-check-email-page',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule],
  template: `
    <section class="auth-page">
      <mat-card class="auth-card baza-glass-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>Sprawdź skrzynkę</mat-card-title>
          <mat-card-subtitle>Potwierdź adres email, aby się zalogować</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>
            Jeśli podany adres @if (email) { (<strong>{{ email }}</strong>) } jest poprawny,
            wysłaliśmy na niego link potwierdzający. Jest ważny 24 godziny.
          </p>
          @if (email) {
            <button mat-stroked-button type="button" (click)="resend()" [disabled]="busy() || sent()">
              {{ sent() ? 'Wysłano ponownie' : 'Wyślij link ponownie' }}
            </button>
          }
        </mat-card-content>
        <mat-card-footer class="auth-footer">
          <a routerLink="/login">Przejdź do logowania</a>
        </mat-card-footer>
      </mat-card>
    </section>
  `,
  styleUrl: './check-email.scss',
})
export class CheckEmailPage {
  private readonly api = inject(AuthApiService);
  protected readonly email = inject(ActivatedRoute).snapshot.queryParamMap.get('email');
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);

  protected async resend(): Promise<void> {
    if (!this.email) {
      return;
    }
    this.busy.set(true);
    try {
      await this.api.resendVerification(this.email);
      this.sent.set(true);
    } catch {
      // The endpoint never reveals anything; a network error is retried by clicking again.
    } finally {
      this.busy.set(false);
    }
  }
}
