import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BAZA_COLOR_SCHEME_STORAGE_KEY,
  resolveBazaColorScheme,
  ThemeService,
} from './theme.service';

describe('resolveBazaColorScheme', () => {
  it('keeps public light and panel dark when nothing is stored', () => {
    expect(resolveBazaColorScheme(null, '/')).toBe('light');
    expect(resolveBazaColorScheme(null, '/companies')).toBe('light');
    expect(resolveBazaColorScheme(null, '/login')).toBe('dark');
    expect(resolveBazaColorScheme(null, '/company/offers')).toBe('dark');
  });

  it('lets a stored preference override the route default', () => {
    expect(resolveBazaColorScheme('dark', '/')).toBe('dark');
    expect(resolveBazaColorScheme('light', '/login')).toBe('light');
  });
});

describe('ThemeService', () => {
  let overlay: OverlayContainer;

  beforeEach(() => {
    localStorage.removeItem(BAZA_COLOR_SCHEME_STORAGE_KEY);
    document.documentElement.classList.remove('baza-panel');
    document.body.classList.remove('baza-panel');
    TestBed.configureTestingModule({
      providers: [ThemeService, OverlayContainer],
    });
    overlay = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    localStorage.removeItem(BAZA_COLOR_SCHEME_STORAGE_KEY);
    document.documentElement.classList.remove('baza-panel');
    document.body.classList.remove('baza-panel');
    overlay.getContainerElement().classList.remove('baza-panel');
  });

  it('applies dark on public pages after toggle and persists it', () => {
    const theme = TestBed.inject(ThemeService);
    theme.syncFromUrl('/');
    expect(theme.isDark()).toBe(false);
    expect(document.body.classList.contains('baza-panel')).toBe(false);

    theme.toggle();

    expect(theme.isDark()).toBe(true);
    expect(localStorage.getItem(BAZA_COLOR_SCHEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('baza-panel')).toBe(true);
    expect(document.body.classList.contains('baza-panel')).toBe(true);
    expect(overlay.getContainerElement().classList.contains('baza-panel')).toBe(
      true
    );
  });

  it('keeps stored dark when navigating to another public route', () => {
    localStorage.setItem(BAZA_COLOR_SCHEME_STORAGE_KEY, 'dark');
    const theme = TestBed.inject(ThemeService);
    theme.syncFromUrl('/');
    theme.syncFromUrl('/companies');
    expect(theme.isDark()).toBe(true);
  });
});
