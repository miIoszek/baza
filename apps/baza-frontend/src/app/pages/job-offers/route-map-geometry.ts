import type { CountryCentroid, GeoPoint, RouteDirection } from '@baza/shared-types';

export type RouteMapLeg = {
  from: GeoPoint;
  to: GeoPoint;
  label: string;
};

/** One unique hop on the overview map (many offers can share PL→DE). */
export type RouteCorridor = {
  from: GeoPoint;
  to: GeoPoint;
  count: number;
  labels: string[];
};

function pointKey(point: GeoPoint): string {
  return `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
}

/** Collapse identical hops so the rest state is one line per corridor. */
export function aggregateRouteCorridors(
  legs: readonly RouteMapLeg[]
): RouteCorridor[] {
  const byKey = new Map<string, RouteCorridor>();
  for (const leg of legs) {
    const key = `${pointKey(leg.from)}>${pointKey(leg.to)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      existing.labels.push(leg.label);
    } else {
      byKey.set(key, {
        from: { ...leg.from },
        to: { ...leg.to },
        count: 1,
        labels: [leg.label],
      });
    }
  }
  return [...byKey.values()];
}

export type MapBasePin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

export function routeLegLabel(fromCode: string, toCode: string): string {
  return `${fromCode}→${toCode}`;
}

/** Dim other hops when a hovered route exists on the map. */
export function routeMapLegEmphasis(
  highlightedLabel: string | null,
  legLabel: string,
  allLabels: readonly string[]
): { dimmed: boolean; emphasized: boolean } {
  const active =
    highlightedLabel != null && allLabels.includes(highlightedLabel);
  return {
    dimmed: active && legLabel !== highlightedLabel,
    emphasized: active && legLabel === highlightedLabel,
  };
}

/** Build polyline legs; skip any hop whose country code lacks a centroid. */
export function buildRouteMapLegs(
  routes: RouteDirection[],
  centroids: CountryCentroid[]
): RouteMapLeg[] {
  const byCode = new Map(centroids.map((c) => [c.code.toUpperCase(), c]));
  const legs: RouteMapLeg[] = [];
  for (const route of routes) {
    const from = byCode.get(route.from.code.toUpperCase());
    const to = byCode.get(route.to.code.toUpperCase());
    if (!from || !to) {
      continue;
    }
    if (
      !Number.isFinite(from.lat) ||
      !Number.isFinite(from.lng) ||
      !Number.isFinite(to.lat) ||
      !Number.isFinite(to.lng)
    ) {
      continue;
    }
    legs.push({
      from: { lat: from.lat, lng: from.lng },
      to: { lat: to.lat, lng: to.lng },
      label: routeLegLabel(route.from.code, route.to.code),
    });
  }
  return legs;
}

export function hasRouteMapGeometry(
  baseLocation: GeoPoint | null | undefined,
  legs: RouteMapLeg[]
): boolean {
  if (legs.length > 0) {
    return true;
  }
  return (
    baseLocation != null &&
    Number.isFinite(baseLocation.lat) &&
    Number.isFinite(baseLocation.lng)
  );
}
