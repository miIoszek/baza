import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { LocalitySuggestion } from '@baza/shared-types';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADDRESS_LOOKUP } from '../../core/address-lookup';
import { BazaAddressAutocomplete } from './address-autocomplete';

const KORNIK: LocalitySuggestion = {
  id: '0970922',
  name: 'Kórnik',
  kind: 'miasto',
  area: 'pow. poznański, woj. wielkopolskie',
  lat: 52.2503,
  lng: 17.0878,
};

@Component({
  standalone: true,
  imports: [BazaAddressAutocomplete],
  template: `<baza-address-autocomplete [value]="value()" (valueChange)="changes.push($event)" />`,
})
class HostComponent {
  readonly value = signal<LocalitySuggestion | null>(null);
  readonly changes: (LocalitySuggestion | null)[] = [];
}

describe('BazaAddressAutocomplete', () => {
  let fixture: ComponentFixture<HostComponent>;
  let search: ReturnType<typeof vi.fn<(q: string) => Observable<LocalitySuggestion[]>>>;

  beforeEach(async () => {
    search = vi.fn<(q: string) => Observable<LocalitySuggestion[]>>(() => of([KORNIK]));
    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
      providers: [{ provide: ADDRESS_LOOKUP, useValue: { search } }],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const input = () =>
    (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  const options = () => Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
  const optionTexts = () => options().map((o) => o.textContent?.replace(/\s+/g, ' ').trim());

  /** Types like a person would and waits out the 250 ms debounce. */
  async function type(text: string): Promise<void> {
    const el = input();
    el.focus();
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('searches after a short pause and shows kind and area under each name', async () => {
    await type('kórn');

    expect(search).toHaveBeenCalledWith('kórn');
    expect(optionTexts()).toEqual(['Kórnik, miasto · pow. poznański, woj. wielkopolskie']);
  });

  it('does not search for fewer than 2 characters', async () => {
    await type('k');
    expect(search).not.toHaveBeenCalled();
  });

  it('emits the picked locality and shows it in the field', async () => {
    await type('kórn');
    options()[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toEqual([KORNIK]);
    expect(input().value).toBe('Kórnik, pow. poznański, woj. wielkopolskie');
  });

  it('says when nothing matches and when the search fails', async () => {
    search.mockReturnValueOnce(of([]));
    await type('qqqq');
    expect(optionTexts()[0]).toContain('Nie znaleziono takiej miejscowości');

    search.mockReturnValueOnce(throwError(() => new Error('offline')));
    await type('qqqqq');
    expect(optionTexts()).toEqual(['Nie udało się pobrać podpowiedzi — spróbuj ponownie']);
  });

  it('suggests narrowing a common name when the list is full', async () => {
    search.mockReturnValueOnce(
      of(Array.from({ length: 8 }, (_, i) => ({ ...KORNIK, id: String(i), name: 'Nowa Wieś' })))
    );
    await type('nowa wies');

    expect(options()).toHaveLength(9);
    expect(optionTexts()[8]).toContain('Dopisz gminę lub powiat, np. „Nowa Wieś Wschowa”');
    expect(options()[8].getAttribute('aria-disabled')).toBe('true');
  });

  it('shows what the page sets and clears when the page clears it', async () => {
    fixture.componentInstance.value.set(KORNIK);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input().value).toBe('Kórnik, pow. poznański, woj. wielkopolskie');

    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input().value).toBe('');
  });
});
