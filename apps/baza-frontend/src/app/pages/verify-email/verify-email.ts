import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../core/auth-api.service';

type State = 'verifying' | 'verified' | 'failed';

/** Landing page of the emailed verification link (`/verify-email?token=…`). */
@Component({
  selector: 'baza-verify-email-page',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="auth-page">
      <mat-card class="auth-card baza-glass-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>Potwierdzenie adresu email</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @switch (state()) {
            @case ('verifying') {
              <mat-spinner diameter="32" />
            }
            @case ('verified') {
              <p role="status">Adres email potwierdzony. Możesz się zalogować.</p>
              <a mat-flat-button color="primary" class="baza-btn-premium" routerLink="/login">
                Przejdź do logowania
              </a>
            }
            @case ('failed') {
              <p role="alert">{{ error() }}</p>
              <p>
                Spróbuj się <a routerLink="/login">zalogować</a>: jeśli adres nie jest jeszcze
                potwierdzony, wyślemy nowy link.
              </p>
            }
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styleUrl: './verify-email.scss',
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(AuthApiService);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly state = signal<State>('verifying');
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.error.set('Link jest nieprawidłowy lub wygasł.');
      this.state.set('failed');
      return;
    }
    try {
      await this.api.verifyEmail(this.token);
      this.state.set('verified');
    } catch (err: unknown) {
      this.error.set(AuthApiService.messageOf(err, 'Link jest nieprawidłowy lub wygasł.'));
      this.state.set('failed');
    }
  }
}
