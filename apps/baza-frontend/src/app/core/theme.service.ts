import { computed, inject, Injectable, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { isBazaPanelUrl } from './baza-panel-url';

export type BazaColorScheme = 'light' | 'dark';

export const BAZA_COLOR_SCHEME_STORAGE_KEY = 'baza-color-scheme';

/** Stored preference wins; otherwise panel routes stay dark and public stays light. */
export function resolveBazaColorScheme(
  stored: string | null,
  url: string
): BazaColorScheme {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return isBazaPanelUrl(url) ? 'dark' : 'light';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly overlay = inject(OverlayContainer);
  readonly scheme = signal<BazaColorScheme>('light');
  readonly isDark = computed(() => this.scheme() === 'dark');

  syncFromUrl(url: string): void {
    this.setScheme(resolveBazaColorScheme(this.readStored(), url), false);
  }

  toggle(): void {
    this.setScheme(this.scheme() === 'dark' ? 'light' : 'dark', true);
  }

  private setScheme(scheme: BazaColorScheme, persist: boolean): void {
    this.scheme.set(scheme);
    if (persist) {
      this.persist(scheme);
    }
    this.applyDom(scheme);
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(BAZA_COLOR_SCHEME_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persist(scheme: BazaColorScheme): void {
    try {
      localStorage.setItem(BAZA_COLOR_SCHEME_STORAGE_KEY, scheme);
    } catch {
      /* private mode / blocked storage */
    }
  }

  private applyDom(scheme: BazaColorScheme): void {
    const dark = scheme === 'dark';
    document.documentElement.classList.toggle('baza-panel', dark);
    document.body.classList.toggle('baza-panel', dark);
    this.overlay.getContainerElement().classList.toggle('baza-panel', dark);
  }
}
