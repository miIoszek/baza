import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { countryNamePl, type CountryCentroid } from '@baza/shared-types';
import { OfferRouteMapComponent } from '../route-map/offer-route-map';
import { buildRouteMapLegs } from '../route-map/route-map-geometry';

/** The preview draws this many routes; the offer keeps all of them. */
export const PREVIEW_ROUTE_LIMIT = 4;

export interface BazaPreviewRoute {
  fromCountry: string;
  toCountry: string;
}

/**
 * Live preview of the routes being edited in the offer form: the offer map without
 * controls, the first four routes it can draw, a note when there are more, a legend.
 */
@Component({
  selector: 'baza-map-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OfferRouteMapComponent],
  templateUrl: './map-preview.html',
  styleUrl: './map-preview.scss',
})
export class BazaMapPreview {
  readonly routes = input.required<readonly BazaPreviewRoute[]>();
  readonly centroids = input.required<CountryCentroid[]>();

  /** Complete routes between two different countries — the ones a map can draw. */
  private readonly drawable = computed(() =>
    this.routes().filter((r) => r.fromCountry && r.toCountry && r.fromCountry !== r.toCountry)
  );

  protected readonly legs = computed(() =>
    buildRouteMapLegs(
      this.drawable()
        .slice(0, PREVIEW_ROUTE_LIMIT)
        .map((r) => ({
          from: { code: r.fromCountry, name: countryNamePl(r.fromCountry) ?? r.fromCountry },
          to: { code: r.toCountry, name: countryNamePl(r.toCountry) ?? r.toCountry },
        })),
      this.centroids()
    )
  );

  protected readonly truncated = computed(() => this.drawable().length > PREVIEW_ROUTE_LIMIT);
}
