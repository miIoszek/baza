import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../core/auth-api.service';
import { BazaAuthLayout, BazaBanner } from '../../ui';

type State = 'verifying' | 'verified' | 'failed';

/** Landing page of the emailed verification link (`/verify-email?token=…`). */
@Component({
  selector: 'baza-verify-email-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule, BazaAuthLayout, BazaBanner],
  template: `
    <baza-auth-layout title="Potwierdzenie adresu email">
      @switch (state()) {
        @case ('verifying') {
          <div class="verify-email__progress" role="status">
            <mat-progress-spinner mode="indeterminate" diameter="28" aria-hidden="true" />
            Sprawdzamy link…
          </div>
        }
        @case ('verified') {
          <baza-banner variant="success">Adres email potwierdzony. Możesz się zalogować.</baza-banner>
          <a mat-flat-button class="verify-email__cta baza-glow" routerLink="/login">
            Przejdź do logowania
          </a>
        }
        @case ('failed') {
          <baza-banner>{{ error() }}</baza-banner>
          <p class="verify-email__hint">
            Spróbuj się <a routerLink="/login">zalogować</a>: jeśli adres nie jest jeszcze
            potwierdzony, wyślemy nowy link.
          </p>
        }
      }
    </baza-auth-layout>
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
