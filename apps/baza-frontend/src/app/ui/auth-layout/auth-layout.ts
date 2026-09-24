import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

let nextId = 0;

/**
 * Frame of the sign-in, registration and password screens (canvas "Login"): logo above one card,
 * a footer link, and a way back to the offers. The card is glass in the dark theme only.
 */
@Component({
  selector: 'baza-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class BazaAuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  /** 520 px card (registration) instead of 420 px. */
  readonly wide = input(false);
  readonly footerText = input<string | null>(null);
  readonly footerLinkLabel = input<string | null>(null);
  readonly footerLink = input<string | null>(null);

  protected readonly titleId = `baza-auth-title-${nextId++}`;
}
