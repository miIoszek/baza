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
import { resolveCssColor } from './css-var-color';
import {
  routeArrowsPixels,
  routeDashSegments,
  type PixelPoint,
} from './route-map-arrow';
import { routeMapLegEmphasis, type RouteMapLeg } from './route-map-geometry';

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
  readonly baseLocation = input<GeoPoint | null>(null);
  readonly legs = input<RouteMapLeg[]>([]);
  readonly highlightedLabel = input<string | null>(null);
  /**
   * Static preview (offer form): no zoom controls and no panning, so a finger on
   * the map still scrolls the page. Read once, when the map is created.
   */
  readonly preview = input(false);

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
    const interactive = !this.preview();
    this.map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: false,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    }).setView([52.1, 19.4], 5);
    if (interactive) {
      // Leaflet's own labels are English ("Zoom in"); screen readers read these.
      L.control
        .zoom({ zoomInTitle: 'Przybliż mapę', zoomOutTitle: 'Oddal mapę' })
        .addTo(this.map);
    }
    addCountryBasemap(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.map.on('zoomend', this.onZoomEnd);
    if (typeof ResizeObserver !== 'undefined') {
      // Refit, not just resize: the first size Leaflet sees can be stale, and the
      // mobile strip grows when expanded — both should show the whole route.
      this.resizeObserver = new ResizeObserver(() => this.paint(true));
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
    const routeLegs = this.legs();
    const highlightedLabel = this.highlightedLabel();
    this.layer.clearLayers();
    const colors = this.resolveThemeColors();
    const bounds = L.latLngBounds([]);
    let hasPoint = false;

    if (base && Number.isFinite(base.lat) && Number.isFinite(base.lng)) {
      const marker = L.circleMarker([base.lat, base.lng], {
        radius: 8,
        color: colors.from,
        weight: 2,
        fillColor: colors.from,
        fillOpacity: 0.35,
      });
      marker.bindPopup('Baza firmy');
      marker.addTo(this.layer);
      bounds.extend([base.lat, base.lng]);
      hasPoint = true;
    }

    hasPoint =
      this.paintLegs(routeLegs, highlightedLabel, colors, bounds) || hasPoint;

    if (fit) {
      // Fit against the container's current size, not a cached one.
      this.map.invalidateSize();
      if (!hasPoint) {
        this.map.setView([52.1, 19.4], 6);
      } else {
        this.map.fitBounds(bounds.pad(0.25), { maxZoom: 6 });
      }
    }
  }

  private paintLegs(
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
