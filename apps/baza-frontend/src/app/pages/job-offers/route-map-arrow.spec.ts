import { routeArrowsPixels, routeDashSegments } from './route-map-arrow';

describe('routeArrowsPixels', () => {
  it('places filled triangles at 20%, 40%, 60% and 80%', () => {
    const arrows = routeArrowsPixels({ x: 0, y: 0 }, { x: 400, y: 0 });
    expect(arrows).toHaveLength(4);
    expect(arrows.map(([tip]) => tip.x)).toEqual([80, 160, 240, 320]);
    for (const [tip, left, right] of arrows) {
      expect(tip.y).toBeCloseTo(0);
      expect(left.x).toBeLessThan(tip.x);
      expect(right.x).toBeLessThan(tip.x);
      expect(left.y).toBeGreaterThan(0);
      expect(right.y).toBeLessThan(0);
    }
  });

  it('skips heads that would overlap on a short segment', () => {
    expect(routeArrowsPixels({ x: 0, y: 0 }, { x: 10, y: 0 })).toEqual([]);
    expect(routeArrowsPixels({ x: 3, y: 4 }, { x: 3, y: 4 })).toEqual([]);
  });
});

describe('routeDashSegments', () => {
  it('breaks the line at each arrow so the head replaces the dash', () => {
    const segments = routeDashSegments({ x: 0, y: 0 }, { x: 400, y: 0 });
    expect(segments).toHaveLength(5);
    expect(segments[0][0].x).toBeCloseTo(0);
    expect(segments[segments.length - 1][1].x).toBeCloseTo(400);
    for (const stop of [80, 160, 240, 320]) {
      const coversStop = segments.some(([a, b]) => a.x <= stop && b.x >= stop);
      expect(coversStop).toBe(false);
    }
  });

  it('returns a single segment when there is no room for arrows', () => {
    const segments = routeDashSegments({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(segments).toHaveLength(1);
    expect(segments[0][0].x).toBeCloseTo(0);
    expect(segments[0][1].x).toBeCloseTo(10);
  });
});
