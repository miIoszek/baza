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
  aggregateRouteCorridors,
  routeMapLegEmphasis,
  type MapBasePin,
  type RouteCorridor,
  type RouteMapLeg,
} from './route-map-geometry';

const FALLBACK_FROM = '#90caf9';
const FALLBACK_TO = '#6ee7b7';
const FALLBACK_LINE = '#fbbf24';
const LINE_WEIGHT = 4;
const LINE_OPACITY = 0.95;
const DIM_OPACITY = 0.22;
const QUIET_OPACITY = 0.38;
const QUIET_WEIGHT = 2;

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
  /** List map: one line per corridor until a card/pin is hovered. */
  readonly overview = input(false);
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
      this.overview();
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

    const overview = this.overview();
    for (const pin of pins) {
      const emphasized = highlightedLabel === pin.id;
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: emphasized ? 11 : overview ? 6 : 8,
        color: colors.from,
        weight: 2,
        fillColor: colors.from,
        fillOpacity: emphasized ? 0.7 : overview ? 0.28 : 0.35,
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

    if (overview) {
      hasPoint =
        this.paintOverview(routeLegs, highlightedLabel, colors, bounds) ||
        hasPoint;
    } else {
      hasPoint =
        this.paintDetailLegs(routeLegs, highlightedLabel, colors, bounds) ||
        hasPoint;
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

  private paintOverview(
    routeLegs: RouteMapLeg[],
    highlightedLabel: string | null,
    colors: { from: string; to: string; line: string },
    bounds: L.LatLngBounds
  ): boolean {
    const corridors = aggregateRouteCorridors(routeLegs);
    let hasPoint = corridors.length > 0;
    for (const corridor of corridors) {
      const active =
        highlightedLabel != null && corridor.labels.includes(highlightedLabel);
      if (active) {
        continue;
      }
      this.addQuietCorridor(
        corridor,
        colors,
        highlightedLabel ? DIM_OPACITY : QUIET_OPACITY,
        bounds
      );
    }
    if (highlightedLabel) {
      for (const leg of routeLegs) {
        if (leg.label !== highlightedLabel) {
          continue;
        }
        this.addDetailHop(leg, colors, true, bounds);
        hasPoint = true;
      }
    }
    return hasPoint;
  }

  private paintDetailLegs(
    routeLegs: RouteMapLeg[],
    highlightedLabel: string | null,
    colors: { from: string; to: string; line: string },
    bounds: L.LatLngBounds
  ): boolean {
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
    for (const leg of ordered) {
      const { dimmed, emphasized } = routeMapLegEmphasis(
        highlightedLabel,
        leg.label,
        labels
      );
      this.addDetailHop(
        leg,
        colors,
        emphasized,
        bounds,
        dimmed ? DIM_OPACITY : LINE_OPACITY
      );
    }
    return ordered.length > 0;
  }

  private addQuietCorridor(
    corridor: RouteCorridor,
    colors: { from: string; to: string; line: string },
    opacity: number,
    bounds: L.LatLngBounds
  ): void {
    if (!this.layer) {
      return;
    }
    const fromLL: L.LatLngExpression = [corridor.from.lat, corridor.from.lng];
    const toLL: L.LatLngExpression = [corridor.to.lat, corridor.to.lng];
    const line = L.polyline([fromLL, toLL], {
      color: colors.line,
      weight: quietWeight(corridor.count),
      opacity,
      lineCap: 'round',
    });
    line.bindPopup(escapeHtml(quietCorridorLabel(corridor.count)));
    line.addTo(this.layer);

    L.circleMarker(toLL, {
      radius: 6,
      color: '#0f172a',
      weight: 1,
      fillColor: colors.to,
      fillOpacity: opacity,
      opacity,
    }).addTo(this.layer);

    bounds.extend(fromLL);
    bounds.extend(toLL);
  }

  private addDetailHop(
    leg: RouteMapLeg,
    colors: { from: string; to: string; line: string },
    emphasized: boolean,
    bounds: L.LatLngBounds,
    opacity = LINE_OPACITY
  ): void {
    if (!this.layer) {
      return;
    }
    const fromLL: L.LatLngExpression = [leg.from.lat, leg.from.lng];
    const toLL: L.LatLngExpression = [leg.to.lat, leg.to.lng];
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

    bounds.extend(fromLL);
    bounds.extend(toLL);
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

function quietWeight(count: number): number {
  return Math.min(5, QUIET_WEIGHT + Math.round(Math.log2(Math.max(1, count))));
}

function quietCorridorLabel(count: number): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (count === 1) {
    return '1 oferta na tej trasie';
  }
  if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) {
    return `${count} oferty na tej trasie`;
  }
  return `${count} ofert na tej trasie`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
