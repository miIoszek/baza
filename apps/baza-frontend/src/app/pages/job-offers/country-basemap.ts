import * as L from 'leaflet';

const COUNTRIES_GEOJSON =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const COUNTRY_STYLE: L.PathOptions = {
  color: 'rgba(100, 116, 139, 0.9)',
  weight: 1,
  fillColor: '#1e293b',
  fillOpacity: 1,
};

let countriesGeojson: Promise<GeoJSON.FeatureCollection> | null = null;

/**
 * Dark country canvas matching the app UI: Natural Earth outlines + names
 * on a navy pane. No raster tiles — they already draw borders/labels.
 */
export function addCountryBasemap(map: L.Map): void {
  map.getContainer().style.background = '#020617';

  if (!map.getPane('countries')) {
    map.createPane('countries');
    const pane = map.getPane('countries');
    if (pane) {
      pane.style.zIndex = '250';
    }
  }

  void loadCountries()
    .then((data) => {
      L.geoJSON(data, {
        pane: 'countries',
        style: COUNTRY_STYLE,
        onEachFeature: (feature, layer) => {
          const name = countryName(feature);
          if (!name) {
            return;
          }
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: 'baza-country-label',
          });
        },
      }).addTo(map);
    })
    .catch(() => {
      /* navy pane remains if GeoJSON is unavailable */
    });
}

function loadCountries(): Promise<GeoJSON.FeatureCollection> {
  if (!countriesGeojson) {
    countriesGeojson = fetch(COUNTRIES_GEOJSON).then((r) => {
      if (!r.ok) {
        throw new Error(`Countries GeoJSON ${r.status}`);
      }
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    });
  }
  return countriesGeojson;
}

function countryName(feature: GeoJSON.Feature): string {
  const props = feature.properties as Record<string, unknown> | null;
  const raw = props?.['NAME'] ?? props?.['name'] ?? props?.['ADMIN'];
  return typeof raw === 'string' ? raw : '';
}
