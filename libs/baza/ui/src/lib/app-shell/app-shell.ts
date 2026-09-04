import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'baza-app-shell',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  /** When set, navbar shows this label instead of Login (e.g. email or company name). */
  readonly accountLabel = input<string | null>(null);
  /** Optional company logo (e.g. R2 s96 URL). */
  readonly accountAvatarUrl = input<string | null>(null);
  readonly logout = output<void>();
}
