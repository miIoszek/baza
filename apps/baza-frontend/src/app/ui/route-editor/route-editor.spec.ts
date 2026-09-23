import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it } from 'vitest';
import { BazaRouteEditor, routeGroup, type BazaRouteRow } from './route-editor';

@Component({
  standalone: true,
  imports: [BazaRouteEditor],
  template: `<baza-route-editor [formArray]="routes" [countries]="countries" />`,
})
class HostComponent {
  readonly routes = new FormArray<BazaRouteRow>([routeGroup('PL', 'IT'), routeGroup('IT', 'PL')]);
  readonly countries = [
    { code: 'PL', name: 'Polska' },
    { code: 'IT', name: 'Włochy' },
  ];
}

describe('BazaRouteEditor', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    // mat-select shows the chosen option only after its options are initialised
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => el().querySelectorAll('.baza-route-editor__row');
  const removeButtons = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('[data-route-remove]'));
  const addButton = () => el().querySelector<HTMLButtonElement>('.baza-route-editor__add');

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('shows a numbered row per route with a labelled remove button', () => {
    expect(rows().length).toBe(2);
    expect(removeButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Usuń trasę 1',
      'Usuń trasę 2',
    ]);
    expect(el().textContent).toContain('Polska (PL)');
    expect(el().textContent).toContain('Włochy (IT)');
  });

  it('adds an empty row and focuses its "Z kraju" select', async () => {
    addButton()?.click();
    await settle();

    expect(host.routes.length).toBe(3);
    expect(host.routes.at(2).getRawValue()).toEqual({ fromCountry: '', toCountry: '' });
    expect(rows().length).toBe(3);
    expect(document.activeElement?.getAttribute('data-route-from')).toBe('2');
  });

  it('removes a row and keeps focus on the row that took its place', async () => {
    removeButtons()[0].click();
    await settle();

    expect(host.routes.getRawValue()).toEqual([{ fromCountry: 'IT', toCountry: 'PL' }]);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Usuń trasę 1');
  });

  it('explains the missing route when the last one is removed', async () => {
    removeButtons()[1].click();
    await settle();
    removeButtons()[0].click();
    await settle();

    expect(host.routes.length).toBe(0);
    const empty = el().querySelector('.baza-route-editor__empty');
    expect(empty?.textContent).toContain(
      'Dodaj przynajmniej jedną trasę — bez niej oferta nie trafi do żadnego filtra.'
    );
    expect(empty?.getAttribute('role')).toBe('status');
    expect(document.activeElement).toBe(addButton());
  });

  it('follows rows the page adds, and shows errors after markAllAsTouched', async () => {
    host.routes.push(routeGroup());
    host.routes.markAllAsTouched();
    await settle();

    expect(rows().length).toBe(3);
    expect(el().querySelectorAll('mat-error').length).toBe(2);
  });
});
