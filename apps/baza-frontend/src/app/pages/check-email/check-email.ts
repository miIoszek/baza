import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthApiService } from '../../core/auth-api.service';
import { BazaAuthLayout, BazaBanner } from '../../ui';

/** Shown after registration when the address still has to be verified. */
@Component({
  selector: 'baza-check-email-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, BazaAuthLayout, BazaBanner],
  template: `
    <baza-auth-layout
      title="Sprawdź skrzynkę"
      subtitle="Potwierdź adres email, aby się zalogować"
      footerLinkLabel="Przejdź do logowania"
      footerLink="/login"
    >
      <p class="check-email__text">
        Jeśli podany adres @if (email) {
          (<strong>{{ email }}</strong>)
        }
        jest poprawny, wysłaliśmy na niego link potwierdzający. Jest ważny 24 godziny.
      </p>
      @if (email) {
        @if (sent()) {
          <baza-banner variant="success">Wysłaliśmy nowy link — sprawdź skrzynkę.</baza-banner>
        } @else {
          <button mat-stroked-button type="button" class="check-email__resend" (click)="resend()" [disabled]="busy()">
            Wyślij link ponownie
          </button>
        }
      }
    </baza-auth-layout>
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
