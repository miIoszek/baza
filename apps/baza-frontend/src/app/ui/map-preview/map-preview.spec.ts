import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { BazaMapPreview, type BazaPreviewRoute } from './map-preview';

const CENTROIDS = [
  { code: 'PL', namePl: 'Polska', lat: 52, lng: 19 },
  { code: 'DE', namePl: 'Niemcy', lat: 51, lng: 10 },
  { code: 'IT', namePl: 'Włochy', lat: 42, lng: 12 },
  { code: 'FR', namePl: 'Francja', lat: 46, lng: 2 },
];

const route = (fromCountry: string, toCountry: string): BazaPreviewRoute => ({
  fromCountry,
  toCountry,
});

describe('BazaMapPreview', () => {
  let fixture: ComponentFixture<BazaMapPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BazaMapPreview] }).compileComponents();
    fixture = TestBed.createComponent(BazaMapPreview);
    fixture.componentRef.setInput('centroids', CENTROIDS);
  });

  function show(routes: BazaPreviewRoute[]) {
    fixture.componentRef.setInput('routes', routes);
    fixture.detectChanges();
    const preview = fixture.componentInstance;
    return {
      labels: preview['legs']().map((l) => l.label),
      text: (fixture.nativeElement as HTMLElement).textContent ?? '',
    };
  }

  it('draws complete routes between two different countries only', () => {
    const { labels, text } = show([
      route('PL', 'DE'),
      route('PL', 'PL'), // domestic: saved with the offer, nothing to draw
      route('IT', ''), // not chosen yet
      route('DE', 'IT'),
    ]);
    expect(labels).toEqual(['PL→DE', 'DE→IT']);
    expect(text).toContain('Kraj początkowy');
    expect(text).toContain('Kraj docelowy');
    expect(text).not.toContain('pierwsze 4 trasy');
  });

  it('draws the first 4 and says the offer keeps the rest', () => {
    const { labels, text } = show([
      route('PL', 'DE'),
      route('DE', 'IT'),
      route('IT', 'FR'),
      route('FR', 'PL'),
      route('DE', 'PL'),
    ]);
    expect(labels).toEqual(['PL→DE', 'DE→IT', 'IT→FR', 'FR→PL']);
    expect(text).toContain('Podgląd pokazuje pierwsze 4 trasy — w ofercie zapiszą się wszystkie.');
  });
});
