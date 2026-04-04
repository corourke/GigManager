export type Point = { x: number; y: number };
export type Obstacle = { 
  id?: string;
  left: number; 
  top: number; 
  right: number; 
  bottom: number 
};

export const ROUTE_MARGIN = 10; // Minimum distance to keep from devices and obstacles when routing to ensure visual separation and avoid collisions, especially important for native where we can't rely on hover interactions for precision.
export const CORNER_RADIUS = 10; // Radius for rounded corners in the path. This is purely visual and does not affect routing logic, but it helps make the paths look smoother and more polished. Adjust as needed for aesthetics.
export const LINE_SPACING = 10; // Minimum spacing between parallel lines when routing multiple connections between the same pair of devices. This helps prevent visual overlap and makes it easier to distinguish individual connections. Adjust as needed based on the typical density of connections in your stage plot.
export const GRID_SIZE = 10; // Grid size for snapping points during routing. This helps to keep paths aligned and visually consistent. Adjust as needed for finer or coarser routing control.
export const OBSTACLE_PADDING = 8; // Additional padding around obstacles to ensure paths don't run too close to them, which can help prevent visual clutter and make it clearer that the path is intentionally avoiding the obstacle. Adjust as needed based on the typical size of devices and obstacles in your stage plot.
export const OUTPUT_STUB_LENGTH = 20; // Minimum length of the initial stub from the device to ensure proper spacing and parallelism

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
  if (pts.length < 2) return pts;
  const result: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = result[result.length - 1];
    const cur = pts[i];
    const next = pts[i + 1];

    // Skip points that are too close to each other
    if (Math.abs(cur.x - prev.x) < 1.5 && Math.abs(cur.y - prev.y) < 1.5) continue;

    if (next) {
      // Check if colinear (redundant point on a straight line)
      const isColinearX = Math.abs(prev.x - cur.x) < 0.2 && Math.abs(cur.x - next.x) < 0.2;
      const isColinearY = Math.abs(prev.y - cur.y) < 0.2 && Math.abs(cur.y - next.y) < 0.2;

      if (isColinearX) {
        const minP = Math.min(prev.y, next.y), maxP = Math.max(prev.y, next.y);
        if (cur.y >= minP && cur.y <= maxP) continue;
      }
      if (isColinearY) {
        const minP = Math.min(prev.x, next.x), maxP = Math.max(prev.x, next.x);
        if (cur.x >= minP && cur.x <= maxP) continue;
      }
    }

    result.push(cur);
  }
  
  return result;
}

export type RoutingResult = {
  points: Point[];
  midX?: number;
  bypassY?: number;
};

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
  destId?: string,
  preferredMidX?: number,
  preferredBypassY?: number
): RoutingResult {
  // Fixed stub to ensure parallel lines with offsets
  const stub = OUTPUT_STUB_LENGTH;
  ;
  
  const osx = x1 + Math.max(OBSTACLE_PADDING + 2, stub + srcOffsetX);
  const oex = x2 - Math.max(OBSTACLE_PADDING + 2, stub - dstOffsetX);
  
  const isBackwards = x1 > x2 - 5; // Very sensitive to backward routing

  let best: Point[] | null = null;
  let bestLen = Infinity;
  let selectedMidX: number | undefined;
  let selectedBypassY: number | undefined;

  const tryPath = (path: Point[], mx?: number, by?: number) => {
    const simplified = simplifyPath(path);
    if (!pathHitsObstacles(simplified, obstacles, sourceId, destId)) {
      const len = totalPathLen(simplified);
      if (len < bestLen) {
        best = simplified;
        bestLen = len;
        selectedMidX = mx;
        selectedBypassY = by;
      }
    }
  };

  // 0. Preferred Paths
  if (preferredMidX !== undefined) {
    tryPath([
      { x: x1, y: y1 }, { x: preferredMidX, y: y1 }, { x: preferredMidX, y: y2 }, { x: x2, y: y2 }
    ], preferredMidX, undefined);
  }
  if (preferredBypassY !== undefined) {
    tryPath([
      { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: preferredBypassY }, { x: oex, y: preferredBypassY }, { x: oex, y: y2 }, { x: x2, y: y2 }
    ], undefined, preferredBypassY);
  }

  // If we already have a valid best path from preferred candidates, we can skip others
  if (best) return { points: best, midX: selectedMidX, bypassY: selectedBypassY };

  // Turn points that incorporate spacing offsets
  // A. Z-paths (3-segment) - Only for forward routing
  if (!isBackwards) {
    const midXCandidates = [
        osx, // Source-aligned lanes are also unique per-pair
        oex, // Destination-aligned lanes are unique per-pair
        (osx + oex) / 2,
    ];
    for (const mx of midXCandidates) {
        // Ensure mx is actually between the escape points or at least to the right of x1
        if (mx > x1 + 5 && mx < x2 - 5) {
            tryPath([
                { x: x1, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: x2, y: y2 }
            ], mx, undefined);
        }
    }
  }

  // B. Bypass paths (5-segment)
  // We need to be careful with yCandidates to avoid "hairpin" turns where the bypass 
  // is on the same line as the output, which might cut through the device.
  const yCandidates = [
      y1 - ROUTE_MARGIN + srcOffsetY,
      y1 + ROUTE_MARGIN + srcOffsetY,
      y2 - ROUTE_MARGIN + dstOffsetY,
      y2 + ROUTE_MARGIN + dstOffsetY,
  ];

  // Avoid using y1 or y2 directly as bypass if it causes a back-track through device
  if (Math.abs(y1 - y2) > 40) {
      yCandidates.push((y1 + y2) / 2);
  }
  
  obstacles.forEach(obs => {
      yCandidates.push(obs.top - ROUTE_MARGIN + srcOffsetY);
      yCandidates.push(obs.bottom + ROUTE_MARGIN + srcOffsetY);
      yCandidates.push(obs.top - ROUTE_MARGIN + dstOffsetY);
      yCandidates.push(obs.bottom + ROUTE_MARGIN + dstOffsetY);
  });

  const sortedYs = Array.from(new Set(yCandidates))
    .filter(y => Math.abs(y - y1) > 10 && Math.abs(y - y2) > 10) // Reduced threshold for more flexibility
    .sort((a, b) => {
        // Favor y-values between the source and destination for a cleaner "between" look
        const midY = (y1 + y2) / 2;
        const distA = Math.abs(a - midY);
        const distB = Math.abs(b - midY);
        const isAInBetween = a >= Math.min(y1, y2) && a <= Math.max(y1, y2);
        const isBInBetween = b >= Math.min(y1, y2) && b <= Math.max(y1, y2);
        
        let scoreA = distA;
        let scoreB = distB;
        if (isAInBetween) scoreA -= 500; // Stronger preference for "between"
        if (isBInBetween) scoreB -= 500;
        
        // Secondary preference for top
        if (a < Math.min(y1, y2)) scoreA -= 20;
        if (b < Math.min(y1, y2)) scoreB -= 20;
        
        return scoreA - scoreB;
    });

  for (const by of sortedYs) {
      tryPath([
          { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: by }, { x: oex, y: by }, { x: oex, y: y2 }, { x: x2, y: y2 }
      ], undefined, by);
      // If we found a good path within reasonable range, stop searching to keep it stable
      if (best && bestLen < totalPathLen([{x:x1,y:y1},{x:x2,y:y2}]) * 2) break;
  }

  // C. Emergency Fallbacks
  if (!best) {
      const bypassYs = [y1 - 200, y2 + 200, y1 - 400, y2 + 400];
      for (const by of bypassYs) {
          tryPath([
              { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: by }, { x: oex, y: by }, { x: oex, y: y2 }, { x: x2, y: y2 }
          ], undefined, by);
      }
  }

  const resultPoints = best || simplifyPath([
      { x: x1, y: y1 }, { x: osx, y: y1 }, { x: osx, y: y1 + 50 }, { x: oex, y: y1 + 50 }, { x: oex, y: y2 }, { x: x2, y: y2 }
  ]);

  return { points: resultPoints, midX: selectedMidX, bypassY: selectedBypassY };
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
