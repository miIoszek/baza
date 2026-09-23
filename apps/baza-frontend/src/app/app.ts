import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AppShell } from '@baza/ui';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/auth.service';
import { isBazaAuthUrl, isBazaFlushLayoutUrl } from './core/baza-panel-url';
import { ThemeService } from './core/theme.service';

@Component({
  imports: [AppShell, RouterModule],
  selector: 'baza-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.baza-panel]': 'isDark()',
  },
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly isDark = this.theme.isDark;
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected flushLayout = isBazaFlushLayoutUrl(this.router.url);
  protected bareLayout = isBazaAuthUrl(this.router.url);

  ngOnInit(): void {
    void this.auth.init();
    this.applyRouteChrome(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => this.applyRouteChrome(e.urlAfterRedirects));
  }

  protected onThemeToggle(): void {
    this.theme.toggle();
  }

  protected async onLogout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }

  private applyRouteChrome(url: string): void {
    this.flushLayout = isBazaFlushLayoutUrl(url);
    this.bareLayout = isBazaAuthUrl(url);
    this.theme.syncFromUrl(url);
  }
}
