import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type { GeoPoint } from '@baza/shared-types';
import * as L from 'leaflet';
import { addCountryBasemap } from './country-basemap';
import { resolveCssColor } from './css-var-color';
import {
  routeArrowsPixels,
  routeDashSegments,
  type PixelPoint,
} from './route-map-arrow';
import {
  routeMapLegEmphasis,
  type MapBasePin,
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
  template: `<div #mapHost class="offer-route-map baza-map-surface" role="presentation"></div>`,
  styleUrl: './offer-route-map.scss',
})
export class OfferRouteMapComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);

  readonly baseLocation = input<GeoPoint | null>(null);
  readonly bases = input<MapBasePin[]>([]);
  readonly legs = input<RouteMapLeg[]>([]);
  readonly highlightedLabel = input<string | null>(null);
  readonly pinHovered = output<string | null>();
  readonly pinClicked = output<string>();

  private readonly mapHost =
    viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private viewReady = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly onZoomEnd = (): void => {
    this.paint(false);
  };

  constructor() {
    effect(() => {
      this.baseLocation();
      this.bases();
      this.legs();
      if (this.viewReady) {
        untracked(() => this.paint(true));
      }
    });
    effect(() => {
      this.highlightedLabel();
      if (this.viewReady) {
        untracked(() => this.paint(false));
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initMap();
    this.paint(true);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
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
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.map?.invalidateSize();
      });
      this.resizeObserver.observe(el);
    }
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private resolveThemeColors(): {
    from: string;
    to: string;
    line: string;
  } {
    const el = this.mapHost().nativeElement;
    return {
      from: resolveCssColor(el, '--baza-map-point-from', FALLBACK_FROM),
      to: resolveCssColor(el, '--baza-map-point-to', FALLBACK_TO),
      line: resolveCssColor(el, '--baza-map-route', FALLBACK_LINE),
    };
  }

  private paint(fit: boolean): void {
    if (!this.map || !this.layer) {
      return;
    }
    const base = this.baseLocation();
    const bases = this.bases();
    const routeLegs = this.legs();
    const highlightedLabel = this.highlightedLabel();
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

    const pins =
      bases.length > 0
        ? bases
        : base && Number.isFinite(base.lat) && Number.isFinite(base.lng)
          ? [
              {
                id: 'base',
                lat: base.lat,
                lng: base.lng,
                label: 'Baza firmy',
              },
            ]
          : [];

    for (const pin of pins) {
      const emphasized = highlightedLabel === pin.id;
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: emphasized ? 11 : 8,
        color: colors.from,
        weight: 2,
        fillColor: colors.from,
        fillOpacity: emphasized ? 0.7 : 0.35,
      });
      marker.bindPopup(escapeHtml(pin.label));
      if (pin.id !== 'base') {
        marker.on('mouseover', () =>
          this.zone.run(() => this.pinHovered.emit(pin.id))
        );
        marker.on('mouseout', () =>
          this.zone.run(() => this.pinHovered.emit(null))
        );
        marker.on('click', () =>
          this.zone.run(() => this.pinClicked.emit(pin.id))
        );
      }
      marker.addTo(this.layer);
      bounds.extend([pin.lat, pin.lng]);
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
