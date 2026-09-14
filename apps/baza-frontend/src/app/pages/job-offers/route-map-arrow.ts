export type PixelPoint = { x: number; y: number };
export type PixelTriangle = [PixelPoint, PixelPoint, PixelPoint];
export type PixelSegment = [PixelPoint, PixelPoint];

/** Arrow tips along each hop, replacing dashes at these fractions. */
export const ROUTE_ARROW_STOPS = [0.2, 0.4, 0.6, 0.8] as const;

const DEFAULT_SIZE = 12.8;
const GAP_PAD = 1.6;
const MIN_SEGMENT = 4;

function unitAlong(
  from: PixelPoint,
  to: PixelPoint
): { len: number; ux: number; uy: number } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return null;
  }
  return { len, ux: dx / len, uy: dy / len };
}

function along(
  from: PixelPoint,
  ux: number,
  uy: number,
  dist: number
): PixelPoint {
  return { x: from.x + ux * dist, y: from.y + uy * dist };
}

function filledTriangle(
  ux: number,
  uy: number,
  tip: PixelPoint,
  pixelSize: number
): PixelTriangle {
  const baseX = tip.x - ux * pixelSize;
  const baseY = tip.y - uy * pixelSize;
  const halfWidth = pixelSize * 0.62;
  const left: PixelPoint = {
    x: baseX - uy * halfWidth,
    y: baseY + ux * halfWidth,
  };
  const right: PixelPoint = {
    x: baseX + uy * halfWidth,
    y: baseY - ux * halfWidth,
  };
  return [tip, left, right];
}

function arrowGap(
  tip: number,
  pixelSize: number,
  len: number
): [number, number] {
  return [Math.max(0, tip - pixelSize - GAP_PAD), Math.min(len, tip + GAP_PAD)];
}

/** Distances along the line where an arrow fits without overlapping the previous one. */
function arrowTips(len: number, pixelSize: number): number[] {
  const tips: number[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;
  for (const t of ROUTE_ARROW_STOPS) {
    const tip = t * len;
    if (tip < pixelSize || tip > len) {
      continue;
    }
    const [start, end] = arrowGap(tip, pixelSize, len);
    if (start < lastEnd) {
      continue;
    }
    tips.push(tip);
    lastEnd = end;
  }
  return tips;
}

/** Filled triangles at 20/40/60/80% of the segment, pointing at `to`. */
export function routeArrowsPixels(
  from: PixelPoint,
  to: PixelPoint,
  pixelSize = DEFAULT_SIZE
): PixelTriangle[] {
  const axis = unitAlong(from, to);
  if (!axis) {
    return [];
  }
  return arrowTips(axis.len, pixelSize).map((tipDist) =>
    filledTriangle(
      axis.ux,
      axis.uy,
      along(from, axis.ux, axis.uy, tipDist),
      pixelSize
    )
  );
}

/**
 * Dashed-line pieces with a gap at each arrow so the head replaces the dash.
 */
export function routeDashSegments(
  from: PixelPoint,
  to: PixelPoint,
  pixelSize = DEFAULT_SIZE
): PixelSegment[] {
  const axis = unitAlong(from, to);
  if (!axis) {
    return [];
  }

  const segments: PixelSegment[] = [];
  let cursor = 0;
  for (const tip of arrowTips(axis.len, pixelSize)) {
    const [gapStart, gapEnd] = arrowGap(tip, pixelSize, axis.len);
    if (gapStart - cursor >= MIN_SEGMENT) {
      segments.push([
        along(from, axis.ux, axis.uy, cursor),
        along(from, axis.ux, axis.uy, gapStart),
      ]);
    }
    cursor = gapEnd;
  }
  if (axis.len - cursor >= MIN_SEGMENT) {
    segments.push([
      along(from, axis.ux, axis.uy, cursor),
      along(from, axis.ux, axis.uy, axis.len),
    ]);
  }
  return segments;
}
