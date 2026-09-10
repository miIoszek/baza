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

export interface OfferMapMarker {
  id: string;
  title: string;
  point: GeoPoint;
  href?: string;
}

@Component({
  selector: 'baza-offers-map',
  standalone: true,
  template: `<div #mapHost class="offers-map" role="presentation"></div>`,
  styleUrl: './offers-map.scss',
})
export class OffersMapComponent implements AfterViewInit, OnDestroy {
  readonly markers = input<OfferMapMarker[]>([]);

  private readonly mapHost =
    viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private viewReady = false;

  constructor() {
    effect(() => {
      const pins = this.markers();
      if (this.viewReady) {
        this.renderMarkers(pins);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initMap();
    this.renderMarkers(this.markers());
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
    this.map = L.map(el, {
      scrollWheelZoom: false,
    }).setView([52.1, 19.4], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(this.map);

    this.layer = L.layerGroup().addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private renderMarkers(pinsInput: OfferMapMarker[]): void {
    if (!this.map || !this.layer) {
      return;
    }
    this.layer.clearLayers();
    const pins = pinsInput.filter(
      (m) => Number.isFinite(m.point.lat) && Number.isFinite(m.point.lng)
    );
    if (pins.length === 0) {
      this.map.setView([52.1, 19.4], 6);
      return;
    }

    const bounds = L.latLngBounds([]);
    for (const pin of pins) {
      const marker = L.circleMarker([pin.point.lat, pin.point.lng], {
        radius: 8,
        color: '#0ea5e9',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.9,
      });
      const link = pin.href
        ? `<a href="${pin.href}">${escapeHtml(pin.title)}</a>`
        : escapeHtml(pin.title);
      marker.bindPopup(link);
      marker.addTo(this.layer);
      bounds.extend([pin.point.lat, pin.point.lng]);
    }
    this.map.fitBounds(bounds.pad(0.2), { maxZoom: 10 });
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
