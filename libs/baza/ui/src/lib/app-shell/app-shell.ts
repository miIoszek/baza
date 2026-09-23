import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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
    '[class.baza-app-shell--bare]': 'bare()',
    '(keydown.escape)': 'onEscape()',
  },
})
export class AppShell {
  /** When set, navbar shows this label instead of Login (e.g. email or company name). */
  readonly accountLabel = input<string | null>(null);
  /** Optional company logo (e.g. R2 s96 URL). */
  readonly accountAvatarUrl = input<string | null>(null);
  /** Full-bleed layout for the public offers split view. */
  readonly flush = input(false);
  /** No app bar and no page padding: screens that bring their own frame (sign-in). */
  readonly bare = input(false);
  /** Current color scheme — sun in dark, moon in light. */
  readonly dark = input(false);
  readonly themeToggle = output<void>();
  readonly logout = output<void>();

  /** Narrow screens: links live in a disclosure panel under the bar. */
  protected readonly menuOpen = signal(false);
  private readonly menuButton = viewChild('menuButton', { read: ElementRef });

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Escape closes the open menu and hands focus back to its button. */
  protected onEscape(): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    (this.menuButton()?.nativeElement as HTMLElement | undefined)?.focus();
  }
}
