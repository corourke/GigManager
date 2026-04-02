export type Point = { x: number; y: number };
export type Obstacle = { 
  id?: string;
  left: number; 
  top: number; 
  right: number; 
  bottom: number 
};

export const ROUTE_MARGIN = 40;
export const CORNER_RADIUS = 8;
export const LINE_SPACING = 12;
export const GRID_SIZE = 10;
export const OBSTACLE_PADDING = 20;

export function snap(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

export function segmentIntersectsBox(a: Point, b: Point, obs: Obstacle): boolean {
  const { left, top, right, bottom } = obs;
  // If the segment is very short (like a stub point), check if the point is inside
  if (Math.abs(a.x - b.x) < 0.1 && Math.abs(a.y - b.y) < 0.1) {
    return a.x > left && a.x < right && a.y > top && a.y < bottom;
  }

  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);

  // If segment is outside the bounding box
  if (maxX <= left || minX >= right || maxY <= top || minY >= bottom) return false;

  // For axis-aligned segments, the above check is sufficient.
  return true;
}

export function pathHitsObstacles(pts: Point[], obstacles: Obstacle[], sourceId?: string, destId?: string): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    for (const obs of obstacles) {
      // Ignore intersection of first segment with source device
      if (sourceId && obs.id === sourceId && i === 0) continue;
      // Ignore intersection of last segment with destination device
      if (destId && obs.id === destId && i === pts.length - 2) continue;
      
      if (segmentIntersectsBox(a, b, obs)) return true;
    }
  }
  return false;
}

export function totalPathLen(pts: Point[]): number {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y);
  }
  return len;
}

export function simplifyPath(pts: Point[]): Point[] {
  if (pts.length < 3) return pts;
  const result: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = result[result.length - 1];
    const cur = pts[i];
    const next = pts[i + 1];

    // Skip duplicate points
    if (Math.abs(cur.x - prev.x) < 0.1 && Math.abs(cur.y - prev.y) < 0.1) continue;

    // Check if colinear AND cur is between prev and next (redundant point on a straight line)
    const isColinearX = Math.abs(prev.x - cur.x) < 0.1 && Math.abs(cur.x - next.x) < 0.1;
    const isColinearY = Math.abs(prev.y - cur.y) < 0.1 && Math.abs(cur.y - next.y) < 0.1;

    if (isColinearX) {
      const betweenY = (cur.y > prev.y && cur.y < next.y) || (cur.y < prev.y && cur.y > next.y);
      if (betweenY) continue;
    }
    if (isColinearY) {
      const betweenX = (cur.x > prev.x && cur.x < next.x) || (cur.x < prev.x && cur.x > next.x);
      if (betweenX) continue;
    }

    result.push(cur);
  }
  
  const last = pts[pts.length - 1];
  const prevLast = result[result.length - 1];
  if (Math.abs(last.x - prevLast.x) > 0.1 || Math.abs(last.y - prevLast.y) > 0.1) {
    result.push(last);
  }
  return result;
}

export function getOrthogonalPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: Obstacle[],
  srcOffsetX: number = 0,
  srcOffsetY: number = 0,
  dstOffsetX: number = 0,
  dstOffsetY: number = 0,
  sourceId?: string,
  destId?: string
): Point[] {
  // Ensure stub is large enough to accommodate offsets without hitting the device
  let stub = Math.max(30, Math.abs(srcOffsetX) + OBSTACLE_PADDING + 5, Math.abs(dstOffsetX) + OBSTACLE_PADDING + 5);
  if (Math.abs(x1 - x2) < stub * 2.5) stub = Math.max(8, Math.abs(x1 - x2) / 3);
  
  const sx = x1 + stub;
  const ex = x2 - stub;

  const isBackwards = x1 > x2 - stub * 2;

  let best: Point[] | null = null;
  let bestLen = Infinity;

  const tryPath = (path: Point[]) => {
    const simplified = simplifyPath(path);
    if (!pathHitsObstacles(simplified, obstacles, sourceId, destId)) {
      const len = totalPathLen(simplified);
      if (len < bestLen) {
        best = simplified;
        bestLen = len;
      }
    }
  };

  // Turn points that incorporate spacing offsets
  const osx = sx + srcOffsetX;
  const oex = ex + dstOffsetX;

  // 1. Basic Z-paths (only if not backwards)
  if (!isBackwards) {
    const candidateXs = [
      (osx + oex) / 2,
      osx + 10,
      oex - 10,
    ];
    
    obstacles.forEach(obs => {
      candidateXs.push(obs.right + ROUTE_MARGIN + srcOffsetX);
      candidateXs.push(obs.left - ROUTE_MARGIN + dstOffsetX);
    });

    for (const midX of candidateXs) {
      tryPath([
        { x: x1, y: y1 }, { x: osx, y: y1 },
        { x: midX, y: y1 }, { x: midX, y: y2 },
        { x: oex, y: y2 }, { x: x2, y: y2 },
      ]);
    }
  }

  // 2. Bypass paths (5-segment or 6-segment)
  const candidateYs = [
    y1 + srcOffsetY,
    y2 + dstOffsetY,
    y1 - ROUTE_MARGIN + srcOffsetY,
    y1 + ROUTE_MARGIN + srcOffsetY,
    y2 - ROUTE_MARGIN + dstOffsetY,
    y2 + ROUTE_MARGIN + dstOffsetY,
  ];
  
  obstacles.forEach(obs => {
    candidateYs.push(obs.top - ROUTE_MARGIN + srcOffsetY);
    candidateYs.push(obs.bottom + ROUTE_MARGIN + srcOffsetY);
    candidateYs.push(obs.top - ROUTE_MARGIN + dstOffsetY);
    candidateYs.push(obs.bottom + ROUTE_MARGIN + dstOffsetY);
  });

  const sortedYs = Array.from(new Set(candidateYs)).sort((a, b) => a - b);

  for (const bY of sortedYs) {
    // 5-segment bypass
    tryPath([
      { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: bY }, { x: oex, y: bY },
      { x: oex, y: y2 }, { x: x2, y: y2 },
    ]);

    // 6-segment bypass (includes a midX)
    if (isBackwards || Math.abs(y1 - y2) > 100) {
      const midXs = [(osx + oex) / 2];
      for (const midX of midXs) {
        tryPath([
          { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: bY }, 
          { x: midX, y: bY }, { x: midX, y: y2 },
          { x: oex, y: y2 }, { x: x2, y: y2 },
        ]);
      }
    }
  }

  // 3. Ultra-bypass
  if (!best) {
    let globalTop = Math.min(y1, y2), globalBottom = Math.max(y1, y2);
    let globalLeft = Math.min(x1, x2), globalRight = Math.max(x1, x2);
    obstacles.forEach(obs => {
      globalTop = Math.min(globalTop, obs.top);
      globalBottom = Math.max(globalBottom, obs.bottom);
      globalLeft = Math.min(globalLeft, obs.left);
      globalRight = Math.max(globalRight, obs.right);
    });
    
    const bypassYs = [globalTop - ROUTE_MARGIN * 2, globalBottom + ROUTE_MARGIN * 2];
    for (const bY of bypassYs) {
      tryPath([
        { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: bY }, { x: oex, y: bY },
        { x: oex, y: y2 }, { x: x2, y: y2 },
      ]);
    }
  }

  return best || simplifyPath([
    { x: x1, y: y1 }, { x: osx, y: y1 },
    { x: (osx + oex) / 2, y: y1 }, { x: (osx + oex) / 2, y: y2 },
    { x: oex, y: y2 }, { x: x2, y: y2 },
  ]);
}

export function pointsToRoundedPath(pts: Point[]): string {
  const simplified = simplifyPath(pts);
  if (simplified.length < 2) return '';
  const r = CORNER_RADIUS;
  let d = `M ${simplified[0].x} ${simplified[0].y}`;

  for (let i = 1; i < simplified.length - 1; i++) {
    const prev = simplified[i - 1], cur = simplified[i], next = simplified[i + 1];
    const dx1 = cur.x - prev.x, dy1 = cur.y - prev.y;
    const dx2 = next.x - cur.x, dy2 = next.y - cur.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len1 === 0 || len2 === 0) {
      d += ` L ${cur.x} ${cur.y}`;
      continue;
    }
    const rr = Math.min(r, len1 / 2, len2 / 2);
    const startX = cur.x - (dx1 / len1) * rr;
    const startY = cur.y - (dy1 / len1) * rr;
    const endX = cur.x + (dx2 / len2) * rr;
    const endY = cur.y + (dy2 / len2) * rr;
    d += ` L ${startX} ${startY} Q ${cur.x} ${cur.y} ${endX} ${endY}`;
  }

  d += ` L ${simplified[simplified.length - 1].x} ${simplified[simplified.length - 1].y}`;
  return d;
}

export function distToSegments(px: number, py: number, pts: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x, ay = pts[i].y;
    const bx = pts[i + 1].x, by = pts[i + 1].y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (d < min) min = d;
  }
  return min;
}
