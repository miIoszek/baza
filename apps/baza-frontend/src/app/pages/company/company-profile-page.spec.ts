import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthMeCompany } from '@baza/shared-types';
import { AuthService } from '../../core/auth.service';
import { CompanyProfilePage } from './company-profile-page';

const COMPANY: AuthMeCompany = {
  id: 'company-1',
  name: 'Acme Transport',
  nip: '7781454968',
  description: 'Fleet',
  baseLocation: 'Poznań',
  baseLat: 52.43,
  baseLng: 16.95,
  photoUrls: null,
};

describe('CompanyProfilePage', () => {
  let auth: {
    whenReady: Mock;
    refreshMe: Mock;
    company: Mock;
    meLoadError: Mock;
    isLoggedIn: Mock;
  };

  beforeEach(async () => {
    auth = {
      whenReady: vi.fn().mockResolvedValue(undefined),
      refreshMe: vi.fn().mockResolvedValue(undefined),
      company: vi.fn().mockReturnValue(COMPANY),
      meLoadError: vi.fn().mockReturnValue(null),
      isLoggedIn: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [CompanyProfilePage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  /** Renders the page (which runs ngOnInit) and waits for the profile. */
  async function start() {
    const fixture = TestBed.createComponent(CompanyProfilePage);
    fixture.detectChanges();
    // ngOnInit awaits the auth service; let that settle before rendering again
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    fixture.detectChanges();
    return {
      fixture,
      page: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('fills the form from the company, coordinates as one line', async () => {
    const { page, el } = await start();

    expect(page['form'].getRawValue()).toEqual({
      name: 'Acme Transport',
      nip: '7781454968',
      description: 'Fleet',
      baseLocation: 'Poznań',
      coordinates: '52.43, 16.95',
    });
    expect(page['pinLabel']()).toBe('52.4300, 16.9500');
    // A pin exists, so manual coordinates wait behind the button
    expect(page['showCoordinates']()).toBe(false);
    expect(el.textContent).toContain('Wpisz współrzędne ręcznie');
  });

  it('without a pin offers the locality picker; coordinates wait behind the button', async () => {
    auth.company.mockReturnValue({ ...COMPANY, baseLat: null, baseLng: null });
    const { page, el } = await start();

    expect(el.querySelector('baza-address-autocomplete')).not.toBeNull();
    expect(page['showCoordinates']()).toBe(false);
    expect(el.textContent).toContain('Brak punktu na mapie');
  });

  it('takes the pin from a picked locality, or marks it as typed by hand', async () => {
    const { page } = await start();
    const kornik = {
      id: '0970922',
      name: 'Kórnik',
      kind: 'miasto',
      area: 'pow. poznański, woj. wielkopolskie',
      lat: 52.2503,
      lng: 17.0878,
    };

    page['onLocality'](kornik);
    expect(page['form'].controls.coordinates.value).toBe('52.2503, 17.0878');
    expect(page['form'].dirty).toBe(true);
    expect(page['pinLabel']()).toBe('Kórnik · 52.2503, 17.0878');

    // Leaving the picker without a pick keeps the pin, drops the name
    page['onLocality'](null);
    expect(page['pinLabel']()).toBe('52.2503, 17.0878');

    page['form'].controls.coordinates.setValue('52.3, 17.1');
    page['onCoordinatesTyped']();
    expect(page['pinLabel']()).toBe('52.3000, 17.1000 · wpisane ręcznie');

    page['onLocality'](kornik);
    page['discardChanges']();
    expect(page['pickedLocality']()).toBeNull();
    expect(page['pinLabel']()).toBe('52.4300, 16.9500');
  });

  it('checks the NIP checksum and accepts spaces and dashes', async () => {
    const { page } = await start();
    const nip = page['form'].controls.nip;

    nip.setValue('1234567890');
    expect(nip.hasError('nip')).toBe(true);
    nip.setValue('778-145-49-68');
    expect(nip.valid).toBe(true);
  });

  it('rejects coordinates that are not two numbers in range', async () => {
    const { page } = await start();
    const coordinates = page['form'].controls.coordinates;

    coordinates.setValue('52.43');
    expect(coordinates.hasError('coordinates')).toBe(true);
    coordinates.setValue('91, 16');
    expect(coordinates.hasError('coordinates')).toBe(true);
    coordinates.setValue('');
    expect(coordinates.valid).toBe(true);
  });

  it('marks form invalid when description exceeds max length', async () => {
    const { page } = await start();

    page['form'].controls.description.setValue('x'.repeat(2001));
    expect(page['form'].controls.description.hasError('maxlength')).toBe(true);
  });

  it('saves digits-only NIP and coordinates read from the pasted line', async () => {
    const { page, http } = await start();
    page['form'].patchValue({ nip: '778 145 49 68', coordinates: '53,1325; 23,1688' });

    const pending = page['onSubmit']();
    const req = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/api/company/profile'));
    const body = req.request.body as FormData;
    expect(body.get('nip')).toBe('7781454968');
    expect(body.get('baseLat')).toBe('53.1325');
    expect(body.get('baseLng')).toBe('23.1688');
    expect(body.get('photo')).toBeNull();
    req.flush({ ...COMPANY, baseLat: 53.1325, baseLng: 23.1688 });
    await pending;

    expect(auth.refreshMe).toHaveBeenCalledTimes(2);
    expect(page['form'].controls.coordinates.value).toBe('53.1325, 23.1688');
    expect(page['form'].pristine).toBe(true);
  });

  it('clears the pin when the coordinates are emptied', async () => {
    const { page, http } = await start();
    page['form'].controls.coordinates.setValue('');

    const pending = page['onSubmit']();
    const req = http.expectOne((r) => r.method === 'PATCH');
    const body = req.request.body as FormData;
    expect(body.get('baseLat')).toBe('');
    expect(body.get('baseLng')).toBe('');
    req.flush({ ...COMPANY, baseLat: null, baseLng: null });
    await pending;
    expect(page['pin']()).toBeNull();
  });

  it('opens the coordinates field when they block saving', async () => {
    const { page, http } = await start();
    page['form'].controls.coordinates.setValue('abc');

    await page['onSubmit']();
    http.expectNone((r) => r.method === 'PATCH');
    expect(page['showCoordinates']()).toBe(true);
  });

  it('"Anuluj" brings back the saved values', async () => {
    const { page } = await start();
    page['form'].patchValue({ name: 'Inna nazwa', coordinates: '50, 20' });

    page['discardChanges']();
    expect(page['form'].controls.name.value).toBe('Acme Transport');
    expect(page['form'].controls.coordinates.value).toBe('52.43, 16.95');
  });

  it('accepts PNG, JPG or WebP logos up to 5 MB only', async () => {
    const { page, el } = await start();
    const input = el.querySelector<HTMLInputElement>('baza-file-drop input[type=file]');
    if (!input) {
      throw new Error('logo file input missing');
    }
    const pick = (file: File) => {
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
    };

    pick(new File(['x'], 'logo.gif', { type: 'image/gif' }));
    expect(page['photoError']()).toBe('Logo musi być plikiem PNG, JPG lub WebP.');

    const big = new File(['x'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    pick(big);
    expect(page['photoError']()).toBe('Logo może mieć najwyżej 5 MB.');
    expect(page['photoName']()).toBeNull();
  });

  it('shows an error with retry when the profile does not load', async () => {
    auth.meLoadError.mockReturnValue('Nie udało się pobrać danych konta');
    const { el } = await start();

    expect(el.textContent).toContain('Nie udało się wczytać profilu');
    expect(el.textContent).toContain('Spróbuj ponownie');
    expect(el.querySelector('form')).toBeNull();
  });

  it('says so when the account has no company', async () => {
    auth.company.mockReturnValue(null);
    const { el } = await start();

    expect(el.textContent).toContain('Nie znaleziono profilu firmy');
    expect(el.querySelector('form')).toBeNull();
  });
});
