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

  private render(
    base: GeoPoint | null,
    routeLegs: RouteMapLeg[]
  ): void {
    if (!this.map || !this.layer) {
      return;
    }
    this.layer.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasPoint = false;

    if (base && Number.isFinite(base.lat) && Number.isFinite(base.lng)) {
      const pin = L.circleMarker([base.lat, base.lng], {
        radius: 9,
        color: '#0ea5e9',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.95,
      });
      pin.bindPopup('Baza firmy');
      pin.addTo(this.layer);
      bounds.extend([base.lat, base.lng]);
      hasPoint = true;
    }

    for (const leg of routeLegs) {
      const latlngs: L.LatLngExpression[] = [
        [leg.from.lat, leg.from.lng],
        [leg.to.lat, leg.to.lng],
      ];
      const line = L.polyline(latlngs, {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.9,
      });
      line.bindPopup(escapeHtml(leg.label));
      line.addTo(this.layer);

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
              pixelSize: 14,
              polygon: false,
              pathOptions: { stroke: true, color: '#f59e0b', weight: 2 },
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
