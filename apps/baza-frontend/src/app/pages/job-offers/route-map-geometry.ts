import type { CountryCentroid, GeoPoint, RouteDirection } from '@baza/shared-types';

export type RouteMapLeg = {
  from: GeoPoint;
  to: GeoPoint;
  label: string;
};

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
      label: `${route.from.code}→${route.to.code}`,
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
