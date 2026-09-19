import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'baza-app-shell',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  host: {
    '[class.baza-app-shell--flush]': 'flush()',
  },
})
export class AppShell {
  /** When set, navbar shows this label instead of Login (e.g. email or company name). */
  readonly accountLabel = input<string | null>(null);
  /** Optional company logo (e.g. R2 s96 URL). */
  readonly accountAvatarUrl = input<string | null>(null);
  /** Full-bleed layout for the public offers split view. */
  readonly flush = input(false);
  /** Current color scheme — sun in dark, moon in light. */
  readonly dark = input(false);
  readonly themeToggle = output<void>();
  readonly logout = output<void>();
}
