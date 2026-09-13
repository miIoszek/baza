import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import type { GeoPoint } from '@baza/shared-types';
import * as L from 'leaflet';
import 'leaflet-polylinedecorator';
import type { RouteMapLeg } from './route-map-geometry';

const FALLBACK_FROM = '#90caf9';
const FALLBACK_TO = '#6ee7b7';
const FALLBACK_LINE = '#fbbf24';

@Component({
  selector: 'baza-offer-route-map',
  standalone: true,
  template: `<div #mapHost class="offer-route-map" role="presentation"></div>`,
  styleUrl: './offer-route-map.scss',
})
export class OfferRouteMapComponent implements AfterViewInit, OnDestroy {
  readonly baseLocation = input<GeoPoint | null>(null);
  readonly legs = input<RouteMapLeg[]>([]);

  private readonly mapHost =
    viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const base = this.baseLocation();
      const routeLegs = this.legs();
      if (this.viewReady) {
        this.render(base, routeLegs);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initMap();
    this.render(this.baseLocation(), this.legs());
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.layer = null;
  }

  private initMap(): void {
    if (this.map) {
      return;
    }
    const el = this.mapHost().nativeElement;
    this.map = L.map(el, { scrollWheelZoom: false }).setView([52.1, 19.4], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private resolveThemeColors(): {
    from: string;
    to: string;
    line: string;
  } {
    const el = this.mapHost().nativeElement;
    return {
      from: resolveCssColor(el, '--baza-map-route-from', FALLBACK_FROM),
      to: resolveCssColor(el, '--baza-map-route-to', FALLBACK_TO),
      line: resolveCssColor(el, '--baza-map-route-line', FALLBACK_LINE),
    };
  }

  private render(
    base: GeoPoint | null,
    routeLegs: RouteMapLeg[]
  ): void {
    if (!this.map || !this.layer) {
      return;
    }
    this.layer.clearLayers();
    const colors = this.resolveThemeColors();
    const bounds = L.latLngBounds([]);
    let hasPoint = false;

    if (base && Number.isFinite(base.lat) && Number.isFinite(base.lng)) {
      const pin = L.circleMarker([base.lat, base.lng], {
        radius: 8,
        color: colors.from,
        weight: 2,
        fillColor: colors.from,
        fillOpacity: 0.35,
      });
      pin.bindPopup('Baza firmy');
      pin.addTo(this.layer);
      bounds.extend([base.lat, base.lng]);
      hasPoint = true;
    }

    for (const leg of routeLegs) {
      const fromLL: L.LatLngExpression = [leg.from.lat, leg.from.lng];
      const toLL: L.LatLngExpression = [leg.to.lat, leg.to.lng];
      const latlngs: L.LatLngExpression[] = [fromLL, toLL];

      const line = L.polyline(latlngs, {
        color: colors.line,
        weight: 5,
        opacity: 0.95,
        dashArray: '10 8',
      });
      line.bindPopup(escapeHtml(leg.label));
      line.addTo(this.layer);

      const fromMarker = L.circleMarker(fromLL, {
        radius: 10,
        color: '#0f172a',
        weight: 2,
        fillColor: colors.from,
        fillOpacity: 1,
      });
      fromMarker.bindPopup(`A · ${escapeHtml(leg.label)}`);
      fromMarker.addTo(this.layer);

      const toMarker = L.circleMarker(toLL, {
        radius: 10,
        color: '#0f172a',
        weight: 2,
        fillColor: colors.to,
        fillOpacity: 1,
      });
      toMarker.bindPopup(`B · ${escapeHtml(leg.label)}`);
      toMarker.addTo(this.layer);

      const decorator = (
        L as unknown as {
          polylineDecorator: (
            pl: L.Polyline,
            opts: unknown
          ) => L.Layer;
        }
      ).polylineDecorator(line, {
        patterns: [
          {
            offset: '55%',
            repeat: 0,
            symbol: (
              L as unknown as {
                Symbol: {
                  arrowHead: (opts: unknown) => unknown;
                };
              }
            ).Symbol.arrowHead({
              pixelSize: 12,
              polygon: false,
              pathOptions: {
                stroke: true,
                color: colors.line,
                weight: 2,
                opacity: 0.7,
              },
            }),
          },
        ],
      });
      decorator.addTo(this.layer);

      bounds.extend([leg.from.lat, leg.from.lng]);
      bounds.extend([leg.to.lat, leg.to.lng]);
      hasPoint = true;
    }

    if (!hasPoint) {
      this.map.setView([52.1, 19.4], 6);
    } else {
      this.map.fitBounds(bounds.pad(0.25), { maxZoom: 8 });
    }
    setTimeout(() => this.map?.invalidateSize(), 0);
  }
}

function resolveCssColor(
  host: HTMLElement,
  varName: string,
  fallback: string
): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${varName})`;
  host.appendChild(probe);
  const color = getComputedStyle(probe).color;
  host.removeChild(probe);
  if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
    return fallback;
  }
  return color;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
