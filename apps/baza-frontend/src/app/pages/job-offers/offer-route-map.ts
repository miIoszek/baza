import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import type { GeoPoint } from '@baza/shared-types';
import * as L from 'leaflet';
import { addCountryBasemap } from './country-basemap';
import {
  routeArrowsPixels,
  routeDashSegments,
  type PixelPoint,
} from './route-map-arrow';
import {
  routeMapLegEmphasis,
  type RouteMapLeg,
} from './route-map-geometry';

const FALLBACK_FROM = '#90caf9';
const FALLBACK_TO = '#6ee7b7';
const FALLBACK_LINE = '#fbbf24';
const LINE_WEIGHT = 4;
const LINE_OPACITY = 0.95;
const DIM_OPACITY = 0.22;

@Component({
  selector: 'baza-offer-route-map',
  standalone: true,
  template: `<div #mapHost class="offer-route-map" role="presentation"></div>`,
  styleUrl: './offer-route-map.scss',
})
export class OfferRouteMapComponent implements AfterViewInit, OnDestroy {
  readonly baseLocation = input<GeoPoint | null>(null);
  readonly legs = input<RouteMapLeg[]>([]);
  readonly highlightedLabel = input<string | null>(null);

  private readonly mapHost =
    viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private viewReady = false;
  private readonly onZoomEnd = (): void => {
    this.paint(
      this.baseLocation(),
      this.legs(),
      this.highlightedLabel(),
      false
    );
  };

  constructor() {
    effect(() => {
      const base = this.baseLocation();
      const routeLegs = this.legs();
      if (this.viewReady) {
        this.paint(
          base,
          routeLegs,
          untracked(() => this.highlightedLabel()),
          true
        );
      }
    });
    effect(() => {
      const highlighted = this.highlightedLabel();
      if (this.viewReady) {
        this.paint(
          untracked(() => this.baseLocation()),
          untracked(() => this.legs()),
          highlighted,
          false
        );
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initMap();
    this.paint(this.baseLocation(), this.legs(), this.highlightedLabel(), true);
  }

  ngOnDestroy(): void {
    this.map?.off('zoomend', this.onZoomEnd);
    this.map?.remove();
    this.map = null;
    this.layer = null;
  }

  private initMap(): void {
    if (this.map) {
      return;
    }
    const el = this.mapHost().nativeElement;
    this.map = L.map(el, { scrollWheelZoom: false }).setView([52.1, 19.4], 5);
    addCountryBasemap(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.map.on('zoomend', this.onZoomEnd);
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

  private paint(
    base: GeoPoint | null,
    routeLegs: RouteMapLeg[],
    highlightedLabel: string | null,
    fit: boolean
  ): void {
    if (!this.map || !this.layer) {
      return;
    }
    this.layer.clearLayers();
    const colors = this.resolveThemeColors();
    const bounds = L.latLngBounds([]);
    let hasPoint = false;
    const labels = routeLegs.map((leg) => leg.label);
    const ordered = [...routeLegs].sort((a, b) => {
      if (a.label === highlightedLabel) {
        return 1;
      }
      if (b.label === highlightedLabel) {
        return -1;
      }
      return 0;
    });

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

    for (const leg of ordered) {
      const fromLL: L.LatLngExpression = [leg.from.lat, leg.from.lng];
      const toLL: L.LatLngExpression = [leg.to.lat, leg.to.lng];
      const { dimmed, emphasized } = routeMapLegEmphasis(
        highlightedLabel,
        leg.label,
        labels
      );
      const opacity = dimmed ? DIM_OPACITY : LINE_OPACITY;
      const weight = emphasized ? LINE_WEIGHT + 1 : LINE_WEIGHT;

      this.addDashedRoute(fromLL, toLL, colors.line, leg.label, opacity, weight);

      const fromMarker = L.circleMarker(fromLL, {
        radius: emphasized ? 11 : 10,
        color: '#0f172a',
        weight: 2,
        fillColor: colors.from,
        fillOpacity: opacity,
        opacity,
      });
      fromMarker.bindPopup(`A · ${escapeHtml(leg.label)}`);
      fromMarker.addTo(this.layer);

      const toMarker = L.circleMarker(toLL, {
        radius: emphasized ? 11 : 10,
        color: '#0f172a',
        weight: 2,
        fillColor: colors.to,
        fillOpacity: opacity,
        opacity,
      });
      toMarker.bindPopup(`B · ${escapeHtml(leg.label)}`);
      toMarker.addTo(this.layer);

      this.addRouteArrows(fromLL, toLL, colors.line, opacity);

      bounds.extend([leg.from.lat, leg.from.lng]);
      bounds.extend([leg.to.lat, leg.to.lng]);
      hasPoint = true;
    }

    if (fit) {
      if (!hasPoint) {
        this.map.setView([52.1, 19.4], 6);
      } else {
        this.map.fitBounds(bounds.pad(0.25), { maxZoom: 6 });
      }
    }
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private addDashedRoute(
    from: L.LatLngExpression,
    to: L.LatLngExpression,
    color: string,
    label: string,
    opacity: number,
    weight: number
  ): void {
    if (!this.map || !this.layer) {
      return;
    }
    const a = this.map.latLngToLayerPoint(from);
    const b = this.map.latLngToLayerPoint(to);
    const segments = routeDashSegments(a, b);
    const pieces =
      segments.length > 0
        ? segments
        : [[a, b] as [PixelPoint, PixelPoint]];
    for (const [start, end] of pieces) {
      const line = L.polyline(
        [this.pointToLatLng(start), this.pointToLatLng(end)],
        {
          color,
          weight,
          opacity,
          dashArray: '6.4 5.12',
        }
      );
      line.bindPopup(escapeHtml(label));
      line.addTo(this.layer);
    }
  }

  private addRouteArrows(
    from: L.LatLngExpression,
    to: L.LatLngExpression,
    color: string,
    opacity: number
  ): void {
    if (!this.map || !this.layer) {
      return;
    }
    const a = this.map.latLngToLayerPoint(from);
    const b = this.map.latLngToLayerPoint(to);
    for (const triangle of routeArrowsPixels(a, b)) {
      this.drawArrowPolygon(triangle, color, opacity);
    }
  }

  private drawArrowPolygon(
    pixels: [PixelPoint, PixelPoint, PixelPoint],
    color: string,
    opacity: number
  ): void {
    if (!this.map || !this.layer) {
      return;
    }
    const latlngs = pixels.map((p) => this.pointToLatLng(p));
    L.polygon(latlngs, {
      color: '#0f172a',
      weight: 2,
      fillColor: color,
      fillOpacity: opacity,
      opacity,
      interactive: false,
    }).addTo(this.layer);
  }

  private pointToLatLng(point: PixelPoint): L.LatLng {
    if (!this.map) {
      throw new Error('map not initialized');
    }
    return this.map.layerPointToLatLng(L.point(point.x, point.y));
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
